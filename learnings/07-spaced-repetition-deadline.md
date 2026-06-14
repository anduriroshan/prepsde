# 07 — Spaced Repetition & Deadline Engine

## Two Algorithms, Zero AI

These are the two most algorithmically interesting parts of the backend, and neither uses AI. They're pure math — deterministic, stateless, and fully unit-testable.

---

## Part 1: The 3-7-15 Spaced Repetition System

### What It Is

When you solve a DSA problem, you need to review it three times to retain it:
- **Day 3** after solving — first review (short-term recall)
- **Day 7** after solving — second review (medium-term consolidation)
- **Day 15** after solving — third review (long-term retention)

After all three reviews, the problem is marked as "mastered."

### Why 3-7-15 Specifically?

This is a simplified version of the **Ebbinghaus forgetting curve**. Research shows memory retention drops exponentially:

```
100% ─┐
      │\
  80% ─┤ \
      │  \
  60% ─┤   \
      │    \_____
  40% ─┤          \________
      │                    \_____________
  20% ─┤
      └──┬──┬───┬────┬──────┬───────────
         1  3   7    15     30     days
```

By reviewing at the steep drop points (Day 3, Day 7, Day 15), you "reset" the curve. Each review makes the curve decay more slowly.

**Why not a more sophisticated algorithm (like Anki's SM-2)?**

SM-2 (SuperMemo Algorithm 2) adjusts intervals based on self-rated difficulty:
- Easy → longer interval
- Hard → shorter interval

We chose fixed intervals (3-7-15) because:
1. **Simplicity for the user** — they don't have to rate difficulty during review
2. **Predictable workload** — you know exactly how many reviews are coming each day
3. **Good enough for 150 problems** — SM-2 shines with thousands of flashcards. For 150 DSA problems over 6 months, fixed intervals are sufficient.

### How It Works in Code

```python
# Determining what's due today
def get_reviews_due_today(problems, today):
    due = []
    for problem in problems:
        days_since = (today - problem.date_solved).days
        
        if days_since == 3 and not problem.reviews.day3:
            due.append((problem, "Day 3"))
        elif days_since == 7 and not problem.reviews.day7:
            due.append((problem, "Day 7"))
        elif days_since == 15 and not problem.reviews.day15:
            due.append((problem, "Day 15"))
    
    return due
```

**Key detail:** The check is `days_since == 3`, not `days_since >= 3`. If you miss Day 3, the review doesn't pile up as overdue forever. This is intentional — we don't want the review queue to become a guilt machine. The deadline engine handles the consequence of missed reviews (deadline extends).

**Alternative approach (not used):** You could track `nextReviewDate` as a field and query `WHERE nextReviewDate <= today`. This is more database-friendly (one indexed query instead of iterating all problems), but the current approach is simpler for the small dataset size (~150 problems).

---

## Part 2: The Deadline Engine

### What It Does

The deadline engine adjusts the user's target end date based on their actual performance. Slack off → deadline extends. Overperform → deadline shrinks.

This runs **nightly** via Cloud Scheduler calling `POST /deadline/nightly`.

### The Algorithm

```python
def calculate_deadline_adjustment(inp: DeadlineEngineInput) -> DeadlineEngineResult:
    """
    Input:
    - start_date, current_target, today
    - last_14_verdicts: list of "deep_work" | "surface" | "lazy" | None
    - weekly_problems_actual vs weekly_problems_target
    
    Output:
    - days_delta: how many days to add/subtract
    - new_target: adjusted date
    - pace_status: "ahead" | "on_track" | "behind"
    """
```

### Extension Logic (Deadline Gets Longer)

Walk backwards through the last 14 days of verdicts. Count consecutive `lazy` or `None` (no reflection) days starting from today:

```python
consecutive_bad_days = 0
for verdict in reversed(last_14_verdicts):
    if verdict is None or verdict == "lazy":
        consecutive_bad_days += 1
    else:
        break  # Streak of bad days is broken
```

**Rule:** 2+ consecutive bad days → extend by 1 day per pair.
- 2 bad days → +1 day
- 4 bad days → +2 days
- 6 bad days → +3 days (capped)

**Why consecutive, not total?** Total bad days would punish someone who had one off day in an otherwise productive week. Consecutive bad days indicate a real slump — a pattern of disengagement, not a single bad day.

### Shrink Logic (Deadline Gets Shorter)

```python
extra_problems = max(0, actual - target)
if extra_problems >= 3:
    shrink = extra_problems // 3
    days_delta -= shrink
```

**Rule:** Every 3 extra problems beyond the weekly target → shrink by 1 day.

**Why 3, not 1?** Solving 1 extra problem is normal variance. Solving 3+ extra means genuine overperformance worth rewarding.

### Weekly Caps

```python
days_delta = min(days_delta, 3)   # Max extension: +3 days/week
days_delta = max(days_delta, -2)  # Max shrink: -2 days/week
```

**Why cap at +3/-2?**
- **+3 cap** prevents a catastrophic two-week slump from adding 14 days. The deadline extends gradually, giving the user time to recover.
- **-2 cap** prevents overwork from collapsing the timeline dangerously. You don't want someone to burn through 30 extra problems and lose 10 days of buffer.
- **Asymmetric caps (+3/-2)** reflect reality: it's easier to fall behind than to get ahead. The system is slightly pessimistic on purpose.

### Why This Is a Pure Function

```python
# No imports of:
# - datetime.now()  ← today is passed as a parameter
# - Firestore       ← data is passed as primitives
# - HTTP clients    ← no external calls

# Input: dates, ints, list of strings
# Output: dates, ints, strings
# Side effects: ZERO
```

**Why this matters for testing:**

```python
def test_two_lazy_days_extends_by_one():
    result = calculate_deadline_adjustment(
        DeadlineEngineInput(
            start_date=date(2026, 6, 16),
            current_target=date(2026, 12, 15),
            today=date(2026, 7, 1),
            last_14_verdicts=[None, None],  # 2 bad days
            weekly_problems_actual=0,
            weekly_problems_target=10,
        )
    )
    assert result.days_delta == 1
    assert result.pace_status == "behind"
```

No mocks, no database setup, no test fixtures. Just input → output. This is **the gold standard** for testable business logic.

---

## How the Nightly Job Works

```
Cloud Scheduler (cron: 0 0 * * *)
       │
       │  POST /deadline/nightly
       │  Header: X-Scheduler-Token: <secret>
       │
       ▼
Cloud Run (FastAPI)
       │
       │  1. Verify scheduler token
       │  2. Query ALL active users from Firestore
       │  3. For each user:
       │     a. Fetch last 14 reflections (get verdicts)
       │     b. Fetch this week's problem count
       │     c. Call calculate_deadline_adjustment()
       │     d. Write adjustment to Firestore
       │  4. Return summary
       │
       ▼
Firestore (updated deadlines)
```

**Why nightly batch instead of real-time?**
- The deadline only needs to update once per day (the unit of measurement is "days")
- Real-time would mean recalculating on every reflection save, every problem log, every task completion — wasted computation
- Batch processing is cheaper (one Cloud Run invocation, not dozens)

---

## The Pace Status Algorithm

```python
if consecutive_bad_days >= 3:
    pace_status = "behind"
elif days_delta < 0:
    pace_status = "ahead"
else:
    pace_status = "on_track"
```

This drives the UI:
- 🟢 **Ahead**: Green badge, positive messaging
- 🟡 **On Track**: Neutral, keep going
- 🔴 **Behind**: Red badge, urgent messaging, deadline has extended

---

## Questions You Should Be Able to Answer

1. "Explain the 3-7-15 spaced repetition system." (Review at 3, 7, 15 days — matches forgetting curve drop points)
2. "Why not use SM-2 like Anki?" (Fixed intervals are simpler, predictable workload, good enough for 150 problems)
3. "What happens if someone misses the Day 3 review?" (Nothing accumulates — the check is `== 3`, not `>= 3`. Deadline engine handles the consequence.)
4. "How does the deadline engine decide to extend the deadline?" (Count consecutive lazy/None days from today backwards, extend by 1 day per pair, cap at +3)
5. "Why is the cap asymmetric (+3 extension, -2 shrink)?" (Easier to fall behind than get ahead — the system is intentionally conservative)
6. "Why is the deadline engine a pure function?" (Fully testable without mocks — input primitives, output primitives, zero side effects)
7. "Why nightly batch instead of real-time?" (Deadline granularity is days, not minutes. Batch is cheaper and simpler.)
8. "How would you unit-test the deadline engine?" (Pass fake dates and verdict lists — no database, no mocks needed)
