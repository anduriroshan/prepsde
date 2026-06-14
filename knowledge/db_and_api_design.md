# PrepSDE — Database & API Design Reference

> Written for engineers implementing the backend from scratch. Every schema decision and endpoint contract traces back to a specific user problem. Read this before touching Firestore or writing a route handler.

---

## Preamble — The Four Core Problems PrepSDE Solves

PrepSDE is designed around four failure modes that end SDE interview prep before it starts.

**1. "I don't know if I'm on track."**
Most candidates prep until they run out of time, then realize they covered only half the material. The deadline engine and dashboard exist entirely to answer one question at every moment: given what you have done vs what you needed to do, will you be ready by your target date? The deadline card on the Home screen is the highest-information element in the whole app.

**2. "I forget what I've learned."**
Solving 150 LeetCode problems means nothing if you cannot recall the core insight of a medium-difficulty tree problem six weeks later. The DSA tracker with 3-7-15 spaced repetition forces re-exposure at exactly the intervals where forgetting is about to happen. Without this, problems are "solved" but not retained.

**3. "I'm lying to myself about how hard I'm working."**
A user who writes "did some arrays, studied system design" in their daily reflection is not working at interview level. The AI reflection grader (BS detector) makes the self-deception visible. A "deep work" verdict requires specific problem names, pattern identifications, and real struggles. Lazy entries get called out. Without this, the streak is just a number with no signal.

**4. "I have no visibility into whether I'm actually improving."**
Solving problems without tracking mastery creates false confidence. The Progress screen's topic mastery bars, weekly summaries, and activity heatmap surface whether the user is actually making ground — not just staying busy. Without this, effort is invisible and patterns of avoidance go unnoticed.

Every schema field and every API endpoint in this document exists to serve one of these four problems. When you are unsure whether a field is necessary, trace it back to this list. If it does not connect, do not add it.

---

## Section 1 — Firestore Collections

---

### 1.1 `users/{uid}`

**The problem:** Without knowing who the user is, what they are targeting, and when their deadline is, every other feature is incoherent. The user document is the root of the entire data graph. If it does not exist, the app cannot render a single meaningful screen.

#### Schema

```json
{
  "uid":                "abc123xyz",
  "email":              "roshan@gmail.com",
  "name":               "Roshan A.",
  "targetRole":         "SDE2",
  "targetCompany":      "Google",
  "startDate":          "2026-06-16",
  "targetDate":         "2026-12-15",
  "originalDeadline":   "2026-12-15",
  "currentPhase":       1,
  "phaseStartDate":     "2026-06-16",
  "focusAreas":         ["DSA", "SystemDesign", "LLD", "Behavioral"],
  "streakCount":        12,
  "longestStreak":      14,
  "lastActiveDate":     "2026-06-13",
  "totalProblemsLogged": 42,
  "geminiLastCalledAt": "2026-06-13T14:32:00Z",
  "createdAt":          "2026-06-16T09:00:00Z",
  "updatedAt":          "2026-06-13T20:45:00Z"
}
```

#### Field-by-field rationale

| Field | Type | Why it exists |
|---|---|---|
| `uid` | string | Firebase UID, also the document ID. Redundant but useful for queries that return the document without knowing the path. |
| `email` | string | Displayed in Profile screen. Sourced from Firebase Auth on onboarding, never user-editable. |
| `name` | string | "Hey, Roshan" greeting on Home screen. Pulled from Google profile on first sign-in. |
| `targetRole` | string enum | Drives the 24-week plan content. SDE1 vs SDE2 vs Senior have different weekly problem counts and system design depth. |
| `targetCompany` | string, optional | Personalizes micro-lessons and deadline engine recommendation text. Not required — users who skip this still get a functional plan. |
| `startDate` | ISO date string | The first day of the 24-week plan. Used by the deadline engine to calculate elapsed time and pace percentage. |
| `targetDate` | ISO date string | The current adjusted deadline. This field moves when the deadline engine runs. Always reflects the most recent deadline. |
| `originalDeadline` | ISO date string | The deadline the user set during onboarding. Never changes. Used by the Profile screen to show "Adjustments: +3 / -1 days" — you compute that by subtracting originalDeadline from targetDate. |
| `currentPhase` | integer 1-3 | Which phase of the prep plan the user is in. The Progress screen shows "Phase 1 — Foundation Reset, Week 4/6". Required for task board content. |
| `phaseStartDate` | ISO date string | When the user entered the current phase. Used to compute "Week 4/6" progress indicator. |
| `focusAreas` | string[] | Selected during onboarding. Determines which task categories appear in the daily checklist. A user who deselects "Behavioral" gets no STAR story tasks. |
| `streakCount` | integer | **Denormalized.** This is the current streak value, stored here so the Home screen can read it in a single document fetch without querying reflections. Why not compute it on-the-fly? Computing a streak requires reading potentially 60+ daily reflection documents. That is 60 Firestore reads vs 1. At scale, this matters. |
| `longestStreak` | integer | Displayed in the streak badge tooltip. Updated whenever streakCount exceeds it. |
| `lastActiveDate` | ISO date string | **Critical for streak calculation.** When a user submits a reflection, the backend checks: is `lastActiveDate` yesterday? If yes, `streakCount++`. If it is today, the streak is unchanged (idempotent). If it is two or more days ago, `streakCount` resets to 1. The streak logic lives here, not in a separate collection. |
| `totalProblemsLogged` | integer | Denormalized counter. The DSA stats bar shows "Total: 42". Reading this field costs 1 document read. Querying `problems` to count would cost N reads. This counter is updated atomically via Firestore `FieldValue.increment(1)` on each problem creation. |
| `geminiLastCalledAt` | ISO datetime string, nullable | The Gemini daily quota gate. Before calling Gemini, the backend reads this field and checks if its date matches today. Stored as a full ISO datetime so that the timezone comparison is unambiguous (comparison done in UTC). Null means the user has never triggered a Gemini call. |
| `createdAt` | Timestamp | When the account was created. Used for "Member since Jun 2026" in Profile. |
| `updatedAt` | Timestamp | Server-set on every write. Used for debugging and eventual analytics. |

#### Why `streakCount` is denormalized instead of computed

If `streakCount` were computed from reflections on every read, the dashboard endpoint would need to fetch all reflections from the past N days, sort them, and count consecutive active days. That is at minimum 7 Firestore reads (7 days of reflections, each a separate document) for every home screen load. With 100 DAU, that is 700 reads per app open. The denormalized counter costs 1 read and 1 write. The tradeoff is that the counter can go stale if a write fails mid-transaction — this is mitigated by using `FieldValue.increment` and by the backend's idempotency check on `lastActiveDate`.

#### Why `settings` is not a separate collection

The UI plan shows three notification toggles: daily reminder, weekly summary, pod updates. These are low-frequency reads (once per Profile page load) and low-cardinality data (3 boolean fields and 2 time strings). A separate `settings/{uid}` collection would cost an additional document read on every profile fetch with no benefit. Embedding them in the user document keeps the profile page load to a single Firestore read. If settings grow significantly (20+ fields), this can be migrated to a subcollection.

#### Access patterns

| Query | Frequency | How |
|---|---|---|
| Read user doc on app launch | Every session | `users.doc(uid).get()` — O(1) by document ID |
| Update `targetDate` after deadline engine runs | Nightly, per user with activity | `users.doc(uid).update({targetDate, updatedAt})` |
| Update `streakCount`, `lastActiveDate` after reflection | ~1/day per active user | `users.doc(uid).update({streakCount, lastActiveDate, updatedAt})` |
| Update `totalProblemsLogged` after problem creation | ~3/day per active user | `users.doc(uid).update({totalProblemsLogged: FieldValue.increment(1)})` |
| Update `geminiLastCalledAt` after AI coach call | 0-1/day per active user | `users.doc(uid).update({geminiLastCalledAt})` |

---

### 1.2 `problems/{problemId}`

**The problem:** Engineers solving LeetCode need a system that tells them which specific problems to review today based on how well they remembered the problem last time they saw it. Without this, they either re-solve everything wastefully or forget the solution and fail interviews. The `nextReviewDate` field is the answer to "what do I need to look at today?"

#### Schema

```json
{
  "id":                  "prob_k8x2m4n9",
  "userId":              "abc123xyz",
  "name":                "Two Sum",
  "url":                 "https://leetcode.com/problems/two-sum/",
  "difficulty":          "easy",
  "pattern":             "arrays",
  "solvedIndependently": "yes",
  "notes":               "Hash map approach: store complement. O(n) time, O(n) space.",
  "reviewCount":         2,
  "nextReviewDate":      "2026-06-21",
  "mastered":            false,
  "reviewHistory": [
    { "date": "2026-06-17", "struggled": false },
    { "date": "2026-06-24", "struggled": false }
  ],
  "masteredAt":          null,
  "createdAt":           "2026-06-14T10:20:00Z",
  "updatedAt":           "2026-06-24T18:45:00Z"
}
```

#### Field-by-field rationale

| Field | Type | Why it exists |
|---|---|---|
| `id` | string | Nanoid or UUID. The document ID in Firestore. Included as a field for easier client-side handling. |
| `userId` | string | Firebase UID of the owner. Required for top-level collection security rules and for the composite index on `(userId, nextReviewDate)`. |
| `name` | string | The problem title. Displayed in the DSA tracker list and in the "Due for Review" section on Home. |
| `url` | string, optional | LeetCode or NeetCode link. Used by the "Open in LeetCode" button on the Problem Detail page. Optional because some users log problems from platforms without stable URLs. |
| `difficulty` | string enum: easy, medium, hard | Color-coded badge in the DSA list. The DSA screen shows green/yellow/red difficulty chips. |
| `pattern` | string enum (15 values) | The core filter axis of the DSA tracker. Users filter by pattern to study a topic systematically. The 15 valid values are defined in `useDSATracker.ts` and are the single source of truth: arrays, two-pointers, sliding-window, stack, binary-search, linked-list, trees, graphs, heap, dp, backtracking, tries, greedy, intervals, bit-manipulation. |
| `solvedIndependently` | string enum: yes, no, partially | Important signal for the AI coach and for the user's own self-assessment. A problem solved with heavy hints should not be marked the same as one solved independently. |
| `notes` | string, optional | User's personal notes. Pre-populates the notes field in Problem Detail. Optional — many users skip this. |
| `reviewCount` | integer 0-3 | The index into the interval schedule [3, 7, 15]. At reviewCount=0, the problem was just logged (next review in 3 days). At reviewCount=1, next review is 7 days. At reviewCount=2, next review is 15 days. At reviewCount=3, the problem is mastered. This field drives the entire SRS engine. |
| `nextReviewDate` | ISO date string "YYYY-MM-DD" | The most important field in this document. The "Due Today" filter queries: `nextReviewDate <= today AND mastered = false`. Stored as a date string, not a Firestore Timestamp, because lexicographic comparison of ISO date strings is equivalent to chronological comparison. This avoids timezone conversion overhead on range queries. |
| `mastered` | boolean | Set to `true` when `reviewCount` reaches 3 without a struggle. Used by the "Mastered" tab filter and by the topic mastery percentage calculation in Progress. |
| `reviewHistory` | array of {date, struggled} | Audit trail of all reviews. Used to display the review timeline visualization on Problem Detail ("Day 3 → Day 7 → Day 15 → Mastered"). Not used for queries. Capped at 3 entries (one per review stage). |
| `masteredAt` | ISO datetime string, nullable | Timestamp of when mastery was achieved. Null until mastered. Used by the Progress screen for "time-to-mastery per pattern" analytics. Could be derived from reviewHistory but is stored separately to avoid client-side computation. |
| `createdAt` | Timestamp | When the problem was first logged. Used to show "logged 5 days ago" in Problem Detail. |
| `updatedAt` | Timestamp | Updated on every review. Used for debugging and for the "weekly problems solved" count (query: createdAt >= weekStart). |

#### Spaced repetition intervals — source of truth

These intervals come directly from `useDSATracker.ts` and must match the server-side logic exactly:

```
Problem just logged:
  reviewCount = 0, nextReviewDate = today + 3

Review 1 — remembered:
  reviewCount = 1, nextReviewDate = today + 7

Review 2 — remembered:
  reviewCount = 2, nextReviewDate = today + 15

Review 3 — remembered:
  reviewCount = 3, mastered = true, masteredAt = now

Any review — struggled:
  reviewCount = 0, nextReviewDate = today + 3
  (reset to the beginning — this is the critical invariant)
```

Why the server sets `nextReviewDate`, not the client: if the client computed this date using its local clock, a user in a different timezone, or with a manipulated device clock, could set `nextReviewDate` to any value. Moving the date computation server-side removes this attack surface and ensures all SRS logic is consistent.

#### Why this is a top-level collection, not a subcollection of `users`

See architecture.md Section 3.1. The short answer: Firestore subcollections offer no read-cost advantage. Problems under `users/{uid}/problems/{id}` would require the same number of reads as `problems/{id}`. The top-level design enables collection group queries (e.g., "all problems with pattern=graphs across all users" for future analytics) and simplifies security rules to `request.auth.uid == resource.data.userId`.

#### Access patterns

| Query | Firestore Query | Index needed |
|---|---|---|
| Due today for a user | `userId == uid AND nextReviewDate <= today AND mastered == false` | `userId ASC, nextReviewDate ASC` |
| All problems for a user, filtered by pattern | `userId == uid AND pattern == "arrays"` | `userId ASC, pattern ASC` |
| Mastered problems for a user | `userId == uid AND mastered == true` | `userId ASC, mastered ASC` |
| Topic mastery: count per pattern | `userId == uid AND pattern == X` (count) | `userId ASC, pattern ASC` |
| Problems logged this week | `userId == uid AND createdAt >= weekStart` | `userId ASC, createdAt DESC` |

---

### 1.3 `reflections/{reflectionId}`

**The problem:** Without a daily record of what the user actually did vs what they said they did, the AI coach has no signal to work with and the streak is just a number with no meaning. The reflection document is the atomic unit of accountability.

#### Schema

```json
{
  "id":          "abc123xyz_2026-06-14",
  "userId":      "abc123xyz",
  "date":        "2026-06-14",
  "rating":      4,
  "content":     "Solved Merge Intervals and Jump Game today using greedy — finally understood why local optimal gives global optimal here. Struggled with Word Break DP, couldn't see the subproblem decomposition independently. Tomorrow: finish the DP section (3 more problems) and read the caching chapter.",
  "aiVerdict":   "deep_work",
  "aiMessage":   "Strong session. Greedy and DP in one sitting shows range. The fact that you can articulate exactly where Word Break broke down (subproblem decomposition) means you're close — revisit it first tomorrow before anything new.",
  "microLesson": null,
  "prescreenResult": "passed",
  "geminiCalled": true,
  "submittedAt":  "2026-06-14T20:30:00Z",
  "updatedAt":    "2026-06-14T20:30:45Z"
}
```

#### Why a single `content` field instead of `accomplished` / `struggled` / `tomorrowPlan`

The original three-field design forced users to mentally bucket their day before writing — "which of these three boxes does this thought belong in?" That friction is the opposite of reflection. The insight that prompted the change: the LLM extracts *more* signal from natural language than it does from pre-categorised fields, because the user's own word choices, ordering, and emphasis carry information that disappears when the text is sorted into labelled boxes.

The UI is now a single chat-like input. The user types everything in one go: what they did, what didn't click, what's next. The AI coach reads the full `content` field and infers structure from context — it does not need `accomplished` to be its own field to understand what was accomplished.

**What we lost:** Nothing queryable. The app never needed to `WHERE accomplished LIKE "%greedy%"` — it queried by date and verdict, both of which still exist.

**What we gained:** A natural journaling experience, a simpler schema, and better AI output because the model has unmediated access to the user's actual words.

#### Field-by-field rationale

| Field | Type | Why it exists |
|---|---|---|
| `id` | string | Constructed as `{userId}_{date}`, e.g. `abc123xyz_2026-06-14`. This is both the document ID and a stored field. Using a composite key as the document ID makes existence checks O(1) — no query needed, no race condition. |
| `userId` | string | Firebase UID. Required for security rules and composite index on `(userId, date)`. |
| `date` | ISO date string "YYYY-MM-DD" | The calendar day this reflection belongs to. Stored as a field even though embedded in the document ID — date range queries (last 14 days for the deadline engine) use this field. |
| `rating` | integer 1-5 | Quick mood signal from the emoji selector. Kept as a separate field because it is the only structured signal from the reflection — the AI coach can use it as context ("user rated their day 2/5 but wrote substantively → surface verdict is more likely right than lazy"). Also used for the trend line chart in Progress. |
| `content` | string, max 2000 chars | The user's free-form reflection. The single source of truth for AI coaching. The pre-screen and Gemini both operate on this field. The LLM extracts accomplishments, struggles, and plans from natural language — no bucketing needed. |
| `aiVerdict` | string enum: `deep_work`, `surface`, `lazy`, `null` | The coach's judgment. Null until evaluation completes. Consumed by the Past Reflections list for verdict badges and by the deadline engine for consecutive-lazy-day detection. |
| `aiMessage` | string, nullable | The coach's 2-4 sentence response, surfaced in the AI chat bubble. Written back async after Gemini returns. |
| `microLesson` | object or null | Surfaced when: (a) pre-screen returns `too_short`, (b) 3+ consecutive lazy/missed days, or (c) Gemini verdict is `lazy`. Contains `title`, `content`, `link`. Null in most cases. |
| `prescreenResult` | string enum: `passed`, `too_short`, `no_keywords`, `quota_exceeded` | Which pre-screen path was taken. Essential for debugging and cost observability. |
| `geminiCalled` | boolean | True only when Gemini was actually invoked. Enables cost queries without reading logs. |
| `submittedAt` | Timestamp | When the reflection was first saved. |
| `updatedAt` | Timestamp | Updated when the AI verdict is written back. Will be slightly after `submittedAt` for any reflection where Gemini was called (the two-step async pattern). |

#### Why the document ID is `{userId}_{date}` not an auto-ID

This choice enforces one reflection per user per calendar day at the database level with zero query overhead. To check if today's reflection exists: `db.collection("reflections").doc(f"{uid}_{today}").get()`. If the document exists, the user has already submitted. No secondary index, no `where` query, no race condition. An auto-ID would require a `where userId == uid AND date == today` query before every create, adding latency and Firestore reads.

This also means `PUT /reflections/{date}` is idempotent for the same day — the backend can use `set(..., merge: true)` without worrying about creating duplicates.

#### What triggers a micro-lesson

Three cases:
1. The pre-screen returns `too_short` or `no_keywords` — the hardcoded surface/lazy responses in the AI coach include a micro-lesson by design.
2. The user has 3+ consecutive days where `aiVerdict` is `lazy` or `null` (no reflection submitted) — the deadline engine detects this and the next AI coach response includes a lesson.
3. Gemini's verdict is `lazy` — the Gemini prompt instructs it to always include a lesson in the `microLesson` field when the verdict is lazy.

#### Access patterns

| Query | Firestore Query | Index needed |
|---|---|---|
| Existence check for today | `doc("abc123xyz_2026-06-14").get()` | None (O(1) by document ID) |
| Past reflections list, paginated | `userId == uid ORDER BY date DESC LIMIT 30` | `userId ASC, date DESC` |
| Last 14 days for deadline engine | `userId == uid AND date >= 14_days_ago ORDER BY date DESC` | `userId ASC, date DESC` |
| This week's reflection count | `userId == uid AND date >= weekStart` | `userId ASC, date DESC` |

---

### 1.4 `deadlineAdjustments/{adjustmentId}`

**The problem:** If the deadline silently moves without explanation, users lose trust in the system and stop engaging. Every change to `users.targetDate` must have an auditable, human-readable record so the user can understand exactly why their deadline shifted by the amount it did.

#### Schema

```json
{
  "id":                "adj_m2k8x9p1",
  "userId":            "abc123xyz",
  "triggeredBy":       "nightly_job",
  "daysDelta":         2,
  "previousDeadline":  "2026-12-13",
  "newDeadline":       "2026-12-15",
  "reason":            "You missed 4 consecutive days of focused work. Deadline extended by 2 days.",
  "lazyDaysCount":     4,
  "extraProblemsCount": 0,
  "weeklyProblemsActual": 3,
  "weeklyProblemsTarget": 10,
  "computedAt":        "2026-06-13T23:00:00Z"
}
```

#### Field-by-field rationale

| Field | Type | Why it exists |
|---|---|---|
| `id` | string | Auto-generated document ID, also stored as a field. |
| `userId` | string | Required for querying adjustment history per user. |
| `triggeredBy` | string enum: nightly_job, manual, phase_gate | Who or what triggered this adjustment. `nightly_job` is the Cloud Scheduler run. `manual` is a future feature (user requests a reset). `phase_gate` is when the gate check forces an extension. Used for debugging: if adjustments look wrong, filter by `triggeredBy == nightly_job` and inspect the inputs. |
| `daysDelta` | integer | Positive = deadline extended. Negative = deadline compressed. Zero should never be written — if delta is 0, no document is created. The Profile screen shows "Adjustments: +3 / -1 days" by summing all positive and negative deltas from this collection. |
| `previousDeadline` | ISO date string | The deadline before this adjustment. Stored so the audit trail is self-contained — you do not need to reconstruct history to understand any single record. |
| `newDeadline` | ISO date string | The deadline after this adjustment. Should equal `previousDeadline + daysDelta` (in days). |
| `reason` | string | Pre-formatted human-readable explanation. The Profile screen and the deadline expansion panel display this string directly. It is not a code or enum — the frontend just renders it. This is intentional: it avoids a localization layer for MVP and keeps the message close to the computation logic. Example: "You solved 6 extra problems this week. Deadline moved up by 2 days." |
| `lazyDaysCount` | integer | The count of consecutive lazy/missed days that drove an extension. Input data that justifies the delta. Stored for analytics: how often does bad performance trigger extensions? |
| `extraProblemsCount` | integer | The count of extra problems beyond target that drove a compression. |
| `weeklyProblemsActual` | integer | Snapshot of actual problems this week at time of computation. Stored so the record is self-contained. |
| `weeklyProblemsTarget` | integer | What the target was for the week. Stored alongside actual for meaningful comparison. |
| `computedAt` | Timestamp | When the adjustment was computed. Used to enforce idempotency: if an adjustment already has `computedAt` today, do not run the engine again. |

#### Why this is an append-only log, not an update to the user document

The user document stores only the current `targetDate`. The adjustment history is a separate, append-only collection because:

1. Audit trail is immutable. You should never update or delete an adjustment record. If the nightly job runs twice on the same day (a bug), the idempotency check uses `computedAt` to prevent a second write.
2. The adjustment history display in the Profile screen and deadline expansion panel needs the full list. Embedding it as an array in the user document would mean unbounded document growth over 24 weeks.
3. The deadline GET endpoint returns the last 10 adjustments — this is a simple paginated query on this collection.

#### Access patterns

| Query | Firestore Query | Index needed |
|---|---|---|
| Adjustment history for a user | `userId == uid ORDER BY computedAt DESC LIMIT 10` | `userId ASC, computedAt DESC` |
| Today's adjustment (idempotency check) | `userId == uid AND computedAt >= todayStart` | `userId ASC, computedAt DESC` |

---

### 1.5 `weeklySnapshots/{snapshotId}`

**The problem:** The Progress tab needs 12 weekly summary cards, a topic mastery breakdown, and an activity heatmap. Computing all of this from 84 days of raw reflections and hundreds of problem documents on every Progress tab open would require 100+ Firestore reads and significant client-side computation. Pre-computing snapshots every Sunday reduces this to 12 reads.

#### Schema

```json
{
  "id":                   "abc123xyz_2026-W24",
  "userId":               "abc123xyz",
  "weekId":               "2026-W24",
  "weekStartDate":        "2026-06-09",
  "weekEndDate":          "2026-06-15",
  "problemsSolved":       11,
  "systemDesignTopics":   3,
  "reflectionsLogged":    6,
  "avgRating":            3.8,
  "verdictCounts": {
    "deep_work": 3,
    "surface":   2,
    "lazy":      1
  },
  "avgVerdict":           "surface",
  "deadlineChangeDays":   0,
  "paceStatus":           "on_track",
  "phaseAtEndOfWeek":     1,
  "generatedAt":          "2026-06-15T08:00:00Z"
}
```

#### Field-by-field rationale

| Field | Type | Why it exists |
|---|---|---|
| `id` | string | Constructed as `{userId}_{weekId}` for O(1) existence checks. The weekly generation job can check existence before computing. |
| `weekId` | string "YYYY-WNN" | ISO week format. Week 24 of 2026 = the week containing June 14, 2026. Used as a readable identifier in the weekly summary card headers ("Week 4 (Jun 9–15)"). |
| `weekStartDate`, `weekEndDate` | ISO date strings | The Monday and Sunday bounding dates. Used to display "Jun 9–15" in the weekly card. The heatmap maps activity to specific dates, not to week IDs. |
| `problemsSolved` | integer | Count of problems with `createdAt` in this week. The weekly summary card shows "Problems: 11". |
| `systemDesignTopics` | integer | Count of system design tasks completed. The weekly card shows "SD: 3". |
| `reflectionsLogged` | integer | Count of reflection documents submitted in this week. Used for weekly pace bar "Reflections: 6/7". |
| `avgRating` | float | Mean of `rating` across all reflections this week. Used for the reflection trend line chart in Progress. |
| `verdictCounts` | map | Count of each verdict for the week. The aggregate weekly verdict card uses this. |
| `avgVerdict` | string enum | The majority verdict for the week (most common of deep_work, surface, lazy). Displayed in the weekly summary card badge. Computed as the mode of verdictCounts. |
| `deadlineChangeDays` | integer | Net deadline change during this week (sum of all adjustment deltas). Zero means no change. The weekly card shows "Deadline: +1 day" in amber. |
| `paceStatus` | string enum | ahead, on_track, or behind. Derived from the deadline engine's output for this week. |
| `phaseAtEndOfWeek` | integer | Which phase the user was in at the end of this week. Needed to make historical snapshots stable even after a phase transition. |
| `generatedAt` | Timestamp | When the Cloud Scheduler generated this snapshot. Used for the idempotency check: if a snapshot for `2026-W24` already exists with `generatedAt` set, skip it. |

#### Why pre-computed, not on-demand

The Progress screen requires data for 12 consecutive weeks. Computing week summaries on-demand would require:
- 7 reflection documents per week × 12 weeks = 84 Firestore reads
- Querying problems for each week
- Client-side aggregation of ratings, verdicts, counts

With pre-computed snapshots: 12 reads from `weeklySnapshots`. That is a 7x reduction in Firestore read cost and eliminates all client-side computation. The tradeoff is that the Progress tab is always slightly stale (up to 7 days for the current week). This is acceptable — the Progress tab is an analytics view, not a real-time feed.

#### Why ISO week format for `weekId`

ISO week numbers (`YYYY-WNN`) are unambiguous, globally standardized, and sort correctly as strings. The alternative — using the week's Monday date as the ID — works but is less readable in debugging. ISO week IDs also map directly to common date library functions in Python (`datetime.isocalendar()`), making generation logic straightforward.

#### Access patterns

| Query | Firestore Query | Index needed |
|---|---|---|
| Last 12 weeks for Progress screen | `userId == uid ORDER BY weekStartDate DESC LIMIT 12` | `userId ASC, weekStartDate DESC` |
| Existence check before generation | `doc("abc123xyz_2026-W24").get()` | None (O(1) by document ID) |

---

## Section 2 — API Endpoints

---

### 2.1 Auth Middleware (Dependency, Not an Endpoint)

**The problem:** Every piece of user data must be locked to its owner. A user must never be able to read or write another user's problems, reflections, or deadline — not by accident and not by manipulation.

The solution is a FastAPI dependency that runs before every protected route handler.

#### How it works

```
Client sends:
  GET /dashboard
  Authorization: Bearer eyJhbGciOiJSUzI1NiIs...

FastAPI Depends(get_current_user):
  1. Extract token from Authorization: Bearer header
     → 401 if header is missing or not "Bearer <token>"

  2. Call firebase_admin.auth.verify_id_token(token, check_revoked=True)
     → On ExpiredIdTokenError: HTTP 401 "Token has expired"
     → On RevokedIdTokenError: HTTP 401 "Token has been revoked"
     → On InvalidIdTokenError: HTTP 401 "Invalid authentication token"
     → On any other exception: HTTP 401 "Authentication failed"

  3. Extract uid = decoded_token["uid"]
     → Attach to request.state.uid

  4. Return uid to the route handler
     → Route handler receives: uid: str = Depends(get_current_user)
     → Route handler ALWAYS uses this uid for Firestore operations
     → Route handler NEVER uses a uid from the request body
```

#### Token lifecycle

Firebase ID tokens have a 1-hour TTL. The Firebase SDK on the client refreshes them silently in the background — the user never sees a "session expired" state during normal use. If the backend receives an expired token (edge case: user had the app open and backgrounded for >1 hour), it returns HTTP 401. The client SDK detects 401 responses, triggers a token refresh, and retries the request transparently.

#### Why no server-side sessions

Sessions require server-side storage (Redis, database) and session cleanup. Cloud Run is stateless — there is no persistent memory between requests and no shared state between instances. Firebase ID tokens are self-contained JWTs: the backend verifies them by signature (using Firebase's public keys, cached by the SDK) with no network call and no database lookup. Zero infrastructure overhead.

#### Cloud Scheduler authentication (separate from Firebase auth)

The nightly deadline job and weekly snapshot job come from Cloud Scheduler, not from a user. They authenticate using a pre-shared secret in the `X-Scheduler-Token` header, verified against the `SCHEDULER_SECRET` environment variable. These routes do NOT accept Firebase tokens — they return HTTP 403 if the scheduler token is missing or wrong. See Section 2.10 for the full endpoint design.

---

### 2.2 `GET /dashboard`

**The problem:** The Home screen needs the streak count, days left, due reviews, today's tasks, pace bars, and paceStatus all visible at the same time. Without a single aggregation endpoint, the client would make 6 separate Firestore reads on every app open, introducing layout shifts and a ~600ms waterfall. One aggregated request from Cloud Run (where each Firestore read is <10ms within the same GCP region) returns everything in a single round-trip.

#### Request

```
GET /dashboard
Authorization: Bearer <firebase_id_token>
Body: none
```

#### Response

```json
{
  "daysLeft":         184,
  "targetDate":       "2026-12-15",
  "originalDeadline": "2026-12-15",
  "paceStatus":       "on_track",
  "pacePercent":      36,
  "streakCount":      12,
  "longestStreak":    14,
  "dueReviewsCount":  2,
  "dueReviews": [
    {
      "id":      "prob_k8x2m4n9",
      "name":    "Two Sum",
      "pattern": "arrays",
      "tag":     "Day 7 review"
    },
    {
      "id":      "prob_p3q7r1s5",
      "name":    "Valid Parentheses",
      "pattern": "stack",
      "tag":     "Day 15 review"
    }
  ],
  "totalProblemsSolved": 42,
  "neetcodeProgress": {
    "solved": 42,
    "total":  150
  },
  "avgAccuracy": 78,
  "todayTasks": [
    {
      "id":       "task_wk4_day3_1",
      "label":    "Solve NeetCode — Stack (7 problems)",
      "done":     false,
      "estimate": "45 min"
    },
    {
      "id":       "task_wk4_day3_2",
      "label":    "Read: Caching & CDNs",
      "done":     true,
      "estimate": "20 min"
    }
  ],
  "weeklyPace": {
    "problemsActual":     8,
    "problemsTarget":     10,
    "systemDesignActual": 3,
    "systemDesignTarget": 5,
    "reflectionsActual":  5,
    "reflectionsTarget":  7
  }
}
```

#### Firestore reads (6, executed in parallel via asyncio.gather)

1. `users/{uid}` — provides: streakCount, longestStreak, lastActiveDate, targetDate, originalDeadline, totalProblemsLogged, currentPhase, startDate
2. `streaks/{uid}` — provides: current streak (cross-check), lastActiveDate for today's streak validation
3. `problems` query — `userId == uid AND nextReviewDate <= today AND mastered == false` — provides: dueReviews list
4. `problems` query — `userId == uid AND createdAt >= thisWeekMonday` — provides: weeklyPace.problemsActual
5. `reflections` query — `userId == uid AND date >= thisWeekMonday` — provides: weeklyPace.reflectionsActual
6. `weeklySnapshots` query — `userId == uid ORDER BY weekStartDate DESC LIMIT 1` — provides: systemDesignActual/Target (from latest snapshot as baseline), weeklyPace targets

#### Business logic

**daysLeft:** `(targetDate - today).days`. Computed using Python's `datetime.date` — no external calls. The `useDeadline` hook in `index.tsx` also computes this client-side from a hardcoded date for the initial render, but the server-computed value is authoritative.

**pacePercent:** `(today - startDate).days / (targetDate - startDate).days × 100`, rounded to integer. This is the "36% of prep complete" progress bar fill.

**Streak validation:** Before returning `streakCount`, the backend checks `lastActiveDate`. If `lastActiveDate` is neither today nor yesterday, the streak has been broken since the last app open — return 0 and write the correction to Firestore. This corrects the case where a user misses a day without opening the app (the streak update normally happens on reflection submission, but if the user never opens the app to submit, the stale count sits in Firestore until the next app open).

**dueReviews tag:** The `tag` field shows "Day 7 review" or "Day 15 review" based on the problem's `reviewCount` at the time of the query. reviewCount=1 → "Day 7 review", reviewCount=2 → "Day 15 review". This is computed in the backend, not stored.

**avgAccuracy:** Computed as the percentage of problems where `solvedIndependently == "yes"` out of all logged problems. This is expensive to compute from raw data (requires reading all problems), so it is taken from the user document's `totalProblemsLogged` and a running `solvedIndependentlyCount` counter (also denormalized on the user doc). If not available, return 0.

#### Error cases

| Scenario | HTTP status | Response |
|---|---|---|
| Missing or invalid Firebase token | 401 | `{"detail": "Token has expired"}` |
| User document does not exist | 404 | `{"detail": "User not found. Complete onboarding first."}` |
| Firestore read failure | 500 | `{"detail": "Internal server error"}` |

#### Why this endpoint is not split into separate routes

The Home screen renders all 6 sections simultaneously. There is no lazy loading or deferred section. Every piece of data is above the fold. Splitting into multiple endpoints would give the client 6 separate spinners to manage, 6 token verifications, and 6 network round-trips from a mobile connection. The aggregation is justified by the UI's concurrent data requirements.

---

### 2.3 `POST /problems`

**The problem:** Logging a problem is the most frequent write action in the DSA tracker. It must complete under 200ms (so the problem appears immediately in the list) and must set `nextReviewDate` correctly server-side so the SRS system works from day one.

#### Request

```
POST /problems
Authorization: Bearer <firebase_id_token>
Content-Type: application/json

{
  "name":                "Merge Intervals",
  "url":                 "https://leetcode.com/problems/merge-intervals/",
  "difficulty":          "medium",
  "pattern":             "intervals",
  "solvedIndependently": "yes",
  "notes":               "Sort by start time, then merge overlapping."
}
```

**Validation rules:**
- `name`: required, non-empty string, max 200 chars
- `url`: optional, must be valid URL if provided
- `difficulty`: required, must be one of `["easy", "medium", "hard"]`
- `pattern`: required, must be one of the 15 valid values from `useDSATracker.ts`: `arrays, two-pointers, sliding-window, stack, binary-search, linked-list, trees, graphs, heap, dp, backtracking, tries, greedy, intervals, bit-manipulation`
- `solvedIndependently`: required, must be one of `["yes", "no", "partially"]`
- `notes`: optional, max 1000 chars

Return HTTP 422 for any validation failure, with Pydantic's field-level error detail.

#### Response (HTTP 201)

```json
{
  "id":                  "prob_k8x2m4n9",
  "name":                "Merge Intervals",
  "url":                 "https://leetcode.com/problems/merge-intervals/",
  "difficulty":          "medium",
  "pattern":             "intervals",
  "solvedIndependently": "yes",
  "notes":               "Sort by start time, then merge overlapping.",
  "reviewCount":         0,
  "nextReviewDate":      "2026-06-17",
  "mastered":            false,
  "masteredAt":          null,
  "reviewHistory":       [],
  "createdAt":           "2026-06-14T10:20:00Z",
  "updatedAt":           "2026-06-14T10:20:00Z"
}
```

#### Firestore writes

1. `problems.doc(problemId).set(...)` — creates the problem document
2. `users.doc(uid).update({totalProblemsLogged: FieldValue.increment(1), updatedAt: now})` — increments the denormalized counter

Both writes happen inside the same request. They are not a Firestore transaction (no atomicity guarantee) because the counter being off by 1 is not a critical failure — it self-corrects on the next increment. If strict consistency is needed later, wrap in a transaction.

#### How `nextReviewDate` is computed

```
nextReviewDate = today + 3 days
```

`today` is `datetime.now(timezone.utc).date()` — UTC date on the server. The +3 day offset is hardcoded from the SRS schedule. This matches the `useDSATracker.ts` hook's local computation exactly, but the server is authoritative.

#### Error cases

| Scenario | HTTP status |
|---|---|
| Invalid `difficulty` value | 422 |
| Invalid `pattern` value | 422 |
| Missing required field | 422 |
| Firestore write failure | 500 |

---

### 2.4 `GET /problems`

**The problem:** The DSA tracker shows filtered, sorted problem lists — "all Trees problems due today", "all mastered Graphs problems". Without server-side filtering, the client would download all 150 problems on every filter change. A 150-problem list is 150 Firestore reads — unacceptable for a mobile client.

#### Request

```
GET /problems?pattern=trees&status=due&difficulty=medium&limit=20&cursor=prob_k8x2m4n9
Authorization: Bearer <firebase_id_token>
```

**Query parameters:**

| Param | Type | Default | Description |
|---|---|---|---|
| `pattern` | string | none | Filter by pattern. Must be one of 15 valid values. |
| `difficulty` | string | none | Filter by difficulty: easy, medium, or hard. |
| `status` | string | `all` | `due` = nextReviewDate <= today AND mastered == false. `mastered` = mastered == true. `all` = no status filter. |
| `limit` | integer | 20 | Max results per page. Max allowed: 50. |
| `cursor` | string | none | Document ID of the last item from the previous page. Used for Firestore cursor pagination. |

#### Response (HTTP 200)

```json
{
  "problems": [
    {
      "id":                  "prob_k8x2m4n9",
      "name":                "Two Sum",
      "difficulty":          "easy",
      "pattern":             "arrays",
      "solvedIndependently": "yes",
      "reviewCount":         2,
      "nextReviewDate":      "2026-06-21",
      "mastered":            false,
      "masteredAt":          null,
      "notes":               "Hash map approach.",
      "url":                 "https://leetcode.com/problems/two-sum/",
      "createdAt":           "2026-06-10T09:00:00Z",
      "updatedAt":           "2026-06-17T18:00:00Z"
    }
  ],
  "nextCursor": "prob_p3q7r1s5",
  "total":      42
}
```

`nextCursor` is the `id` of the last item in the current page. Pass it as `cursor` in the next request to get the next page. Null if this is the last page.

#### Composite indexes required

The Firestore queries this endpoint generates require these composite indexes (`firestore.indexes.json`):

| Fields | Query it supports |
|---|---|
| `userId ASC, nextReviewDate ASC` | status=due (no pattern filter) |
| `userId ASC, pattern ASC, nextReviewDate ASC` | status=due with pattern filter |
| `userId ASC, mastered ASC` | status=mastered |
| `userId ASC, pattern ASC, mastered ASC` | status=mastered with pattern filter |
| `userId ASC, difficulty ASC, nextReviewDate ASC` | status=due with difficulty filter |

Firestore requires composite indexes for any query that filters on more than one field. Define all of these in `firestore.indexes.json` before deploying.

#### Error cases

| Scenario | HTTP status |
|---|---|
| Invalid `pattern` value | 422 |
| Invalid `status` value | 422 |
| `limit` > 50 | 422 |

---

### 2.5 `PUT /problems/{problemId}/review`

**The problem:** Spaced repetition only works if review intervals update correctly after each review session. This is the most data-sensitive write in the application — a bug here means the user reviews problems too rarely (forgetting them before the interview) or too frequently (wasting time on already-mastered material).

#### Request

```
PUT /problems/prob_k8x2m4n9/review
Authorization: Bearer <firebase_id_token>
Content-Type: application/json

{
  "struggled": false
}
```

**Validation:** `struggled` is required, must be boolean.

#### Response (HTTP 200)

```json
{
  "id":             "prob_k8x2m4n9",
  "reviewCount":    3,
  "nextReviewDate": "2026-07-06",
  "mastered":       true,
  "masteredAt":     "2026-06-14T18:45:00Z",
  "reviewHistory": [
    { "date": "2026-06-17", "struggled": false },
    { "date": "2026-06-24", "struggled": false },
    { "date": "2026-07-06", "struggled": false }
  ]
}
```

#### Two computation paths

**Path A: `struggled == false`**
```
intervals = [3, 7, 15]
nextInterval = intervals[current_reviewCount]  # 3, 7, or 15 depending on stage
                                                # If reviewCount >= 3 (already would be mastered), this path should not be reached
nextReviewDate = today + nextInterval days
reviewCount = current_reviewCount + 1
mastered = (new reviewCount >= 3)
masteredAt = now if mastered else null
```

**Path B: `struggled == true`**
```
nextReviewDate = today + 3 days   # Reset to beginning
reviewCount = 0                    # Reset to beginning
mastered = false                   # Can never be mastered on a struggle
```

This matches `useDSATracker.ts` exactly. The `intervals = [3, 7, 15]` array is the single source of truth, derived from the hook.

#### Ownership check

Before updating, the backend must verify `problem.userId == uid`. This prevents a user from marking another user's problem as reviewed by guessing a `problemId`. Return HTTP 403 if the userId does not match.

#### Why mastery is set here, not in a background job

Mastery is a direct function of `reviewCount`. It has no ambiguity: if `reviewCount >= 3 AND no struggle on this review`, the problem is mastered. Setting it synchronously in the review endpoint means the UI can immediately show the "Mastered" badge and move the problem to the mastered tab. A background job would introduce a delay and a visible inconsistency between what the user just did and what the app reflects.

#### Firestore writes

1. `problems.doc(problemId).update({reviewCount, nextReviewDate, mastered, masteredAt, reviewHistory, updatedAt})`

One write, no transaction needed.

#### Error cases

| Scenario | HTTP status |
|---|---|
| `problemId` does not exist | 404 |
| Problem belongs to a different user | 403 |
| Problem is already mastered | 400 `{"detail": "Problem is already mastered."}` |

---

### 2.6 `POST /reflections`

**The problem:** The user submits their daily reflection. The reflection must be saved instantly — the user should receive a 201 confirmation within 200ms. AI evaluation via Gemini can take 1-3 seconds. The user should not stare at a spinner waiting for Gemini. Persistence and AI evaluation are two separate concerns and must be decoupled.

#### Request

```
POST /reflections
Authorization: Bearer <firebase_id_token>
Content-Type: application/json

{
  "rating":        4,
  "content": "Solved Merge Intervals and Jump Game using greedy. Struggled with Word Break DP — couldn't see the subproblem decomposition. Tomorrow: finish DP section and read caching chapter."
}
```

**Validation rules:**
- `rating`: required, integer 1-5
- `content`: required, non-empty string, min 10 chars, max 2000 chars

#### Response (HTTP 201)

```json
{
  "id":              "abc123xyz_2026-06-14",
  "date":            "2026-06-14",
  "rating":          4,
  "accomplished":    "Solved Merge Intervals and Jump Game using greedy approach.",
  "struggled":       "Struggled with Word Break DP formulation.",
  "tomorrowPlan":    "Finish DP section (3 problems). Read caching chapter.",
  "aiVerdict":       null,
  "aiMessage":       null,
  "microLesson":     null,
  "prescreenResult": null,
  "geminiCalled":    false,
  "submittedAt":     "2026-06-14T20:30:00Z"
}
```

The response returns immediately after the Firestore write. The AI evaluation fields are all null. The client should then call `POST /ai/coach` to trigger evaluation — this is the two-step pattern.

#### What happens in the background

After the Firestore write, the backend triggers an asyncio background task (using FastAPI's `BackgroundTasks`) to update the streak:

```
1. Read streaks/{uid}
2. Is lastActiveDate == yesterday? → streakCount++, lastActiveDate = today
3. Is lastActiveDate == today? → no change (idempotent)
4. Else → streakCount = 1, lastActiveDate = today (streak broken, start over)
5. Write updated streak to streaks/{uid}
6. Write updated streakCount, lastActiveDate to users/{uid}
```

The streak update is a background task because it is not needed for the 201 response. It runs asynchronously after the response is sent. If it fails (Firestore error), the streak will self-correct on the next submission or on the next app open (dashboard endpoint validates streak from lastActiveDate).

#### Idempotency

If the user submits a second reflection today (e.g., app crash and retry), the backend detects the existing document `{uid}_{date}` and returns HTTP 409:

```json
{
  "detail": "A reflection for today already exists. Use PUT /reflections/2026-06-14 to update it."
}
```

#### Firestore writes

1. `reflections.doc(f"{uid}_{today}").set({...all fields...})`

One write.

#### Error cases

| Scenario | HTTP status |
|---|---|
| Missing required field | 422 |
| rating out of range | 422 |
| Reflection already exists for today | 409 |
| Firestore write failure | 500 |

---

### 2.7 `POST /ai/coach`

**The problem:** The AI coach is what makes PrepSDE more than a todo list. But Gemini costs money, has latency variability, and returns unstructured JSON that can be malformed. The pre-screen protects the budget by eliminating Gemini calls for low-quality reflections (the common case in early weeks). The quota check prevents more than one Gemini call per user per day. The fallback responses ensure the endpoint never returns an error to the user even when Gemini fails.

#### Request

```
POST /ai/coach
Authorization: Bearer <firebase_id_token>
Content-Type: application/json

{
  "reflectionId": "abc123xyz_2026-06-14",
  "accomplished": "Solved Merge Intervals and Jump Game using greedy approach.",
  "struggled":    "Struggled with Word Break DP formulation. Could not decompose subproblem.",
  "tomorrowPlan": "Finish DP section (3 problems). Read caching chapter.",
  "rating":       4
}
```

#### Response (HTTP 200)

```json
{
  "verdict":      "deep_work",
  "feedback":     "Strong entry today. Greedy and DP in the same session is ambitious — good that you identified exactly where the gap is. For Word Break, the key insight is treating each index as a subproblem: can I build a valid word ending here? Revisit it tomorrow first thing.",
  "lessonTitle":  "Dynamic Programming: Recognizing the Subproblem Structure",
  "lessonContent": "The hardest part of DP problems is seeing that the problem can be broken into overlapping subproblems...",
  "prescreenResult": "passed",
  "geminiCalled": true
}
```

#### Pre-screen decision tree

```
Input: combined text = accomplished + struggled + tomorrowPlan

Step 1: Length check
  combined.length < 30 chars?
  YES → return hardcoded_lazy_response()
         prescreenResult = "too_short"
         geminiCalled = false
         STOP
  NO  → continue

Step 2: Technical keyword check
  any(keyword in combined.lower() for keyword in ALL_TECHNICAL_KEYWORDS)?
  NO  → return hardcoded_surface_response()
         prescreenResult = "no_keywords"
         geminiCalled = false
         STOP
  YES → continue

Step 3: Daily quota check (Firestore read)
  users/{uid}.geminiLastCalledAt is today's date (UTC)?
  YES → return hardcoded_quota_exceeded_response()
         prescreenResult = "quota_exceeded"
         geminiCalled = false
         STOP
  NO  → continue

Step 4: Call Gemini API
  success → parse JSON, validate schema
           → write prescreenResult = "passed", geminiCalled = true to reflections/{id}
           → write geminiLastCalledAt = now() to users/{uid}
           → return parsed response

  failure  → log error
           → return hardcoded_surface_response()
             (graceful degradation — never crash the endpoint)
```

#### DSA and system design keyword lists

These are the minimum required keyword sets. The backend in `ai_coach.py` contains the full extended list from `backend_architecture.md`:

DSA keywords (subset): array, arrays, tree, trees, graph, graphs, dynamic programming, dp, recursion, backtracking, binary search, hash map, hashmap, queue, stack, heap, linked list, sorting, sort, two pointer, two pointers, sliding window, bfs, dfs, trie, greedy, bit manipulation, complexity

System design keywords (subset): scalability, load balancer, cache, caching, redis, database, sharding, replication, microservice, api gateway, message queue, kafka, cdn, consistency, availability, partition, cap theorem, rate limiting, distributed, latency, throughput

The keyword check uses substring matching in lowercase: `any(kw in combined_lower for kw in ALL_TECHNICAL_KEYWORDS)`. This handles concatenated terms like "twopointers" and avoids word-boundary edge cases.

#### Gemini prompt

**System prompt:**
```
You are the PrepSDE AI Coach. You evaluate daily prep reflections from software engineers
preparing for senior-level SDE interviews at top tech companies.

Your job is to assess effort and quality, then provide useful feedback. Be direct, specific,
and calibrated — not motivational-poster generic.

Output ONLY valid JSON matching this exact schema:
{
  "verdict": "deep_work" | "surface" | "lazy",
  "feedback": string (2-4 sentences, specific to what they wrote),
  "lessonTitle": string (a real engineering concept, not generic),
  "lessonContent": string (3 paragraphs, factual engineering content relevant to their focus)
}

Verdict definitions:
- deep_work: Specific problems mentioned, patterns identified, real struggles described,
  tomorrow's plan is concrete
- surface: Some activity mentioned but vague ("did some arrays"), no specifics
- lazy: Minimal content, filler words, or clearly not a genuine reflection

Do not output anything except the JSON object. No markdown, no preamble.
```

**User message template:**
```
Evaluate this prep reflection:

Accomplished: {accomplished}
Struggled with: {struggled}
Tomorrow's plan: {tomorrowPlan}
Day rating: {rating}/5

The user is preparing for {targetRole} at a top tech company. Current phase: {currentPhase}/3.
```

#### Malformed Gemini response handling

If Gemini returns a response that is not valid JSON, or is valid JSON but missing required fields, or has an invalid `verdict` value:

1. Log the raw response at ERROR level with the uid and request details
2. Return `hardcoded_surface_response()` — do NOT return an error to the user
3. Do NOT write `geminiCalled = true` or update `geminiLastCalledAt` (the call failed, quota should not be consumed)
4. Do NOT re-raise the exception

The endpoint must never return HTTP 500 to the user due to a Gemini parsing failure. Graceful degradation to a rule-based response is always available.

#### Write-back to reflection document

After a successful Gemini response, the backend updates the reflection document:

```
reflections.doc(reflectionId).update({
  aiVerdict: verdict,
  aiMessage: feedback,
  microLesson: {title, content, link} or null,
  prescreenResult: "passed",
  geminiCalled: true,
  updatedAt: now()
})
```

The reflection document was created by `POST /reflections` with all AI fields as null. This write-back fills them in. The client can observe this update via a Firestore real-time listener on the reflection document, which is how the AI feedback card animates in on the Reflect screen.

#### Error cases

| Scenario | HTTP status | Behavior |
|---|---|---|
| Pre-screen fails (too_short) | 200 | Hardcoded lazy response |
| Pre-screen fails (no_keywords) | 200 | Hardcoded surface response |
| Daily quota exceeded | 200 | Hardcoded quota_exceeded response |
| Gemini API error | 200 | Hardcoded surface response (graceful degradation) |
| Gemini returns malformed JSON | 200 | Hardcoded surface response (log error) |
| reflectionId does not exist | 404 | — |
| reflectionId belongs to different user | 403 | — |

---

### 2.8 `GET /reflections`

**The problem:** The Reflect screen shows the user's past reflections with colored verdict badges ("Jun 12 — Deep Work", "Jun 11 — Lazy"). Without server-side pagination, the client would fetch all reflections in a single query — a user 12 weeks into prep has 60+ reflection documents.

#### Request

```
GET /reflections?limit=30&before=2026-06-14
Authorization: Bearer <firebase_id_token>
```

**Query parameters:**

| Param | Default | Description |
|---|---|---|
| `limit` | 30 | Max results. Max allowed: 50. |
| `before` | none (returns most recent) | ISO date string. Returns reflections with date < this value. Used for pagination. |

#### Response (HTTP 200)

```json
{
  "reflections": [
    {
      "id":              "abc123xyz_2026-06-13",
      "date":            "2026-06-13",
      "rating":          3,
      "accomplished":    "Solved Two Sum and Valid Parentheses.",
      "struggled":       "Stack problems feel mechanical, not sure I understand the pattern deeply.",
      "tomorrowPlan":    "Do 2 more stack problems, focus on Monotonic Stack.",
      "aiVerdict":       "surface",
      "aiMessage":       "You showed up — that counts...",
      "microLesson":     null,
      "prescreenResult": "passed",
      "geminiCalled":    true,
      "submittedAt":     "2026-06-13T21:00:00Z"
    }
  ],
  "nextCursor": "2026-06-12",
  "hasMore":    true
}
```

Results are ordered by `date DESC`. `nextCursor` is the date of the last item returned. Pass it as `before` in the next request.

#### Firestore query

```
userId == uid AND date < before ORDER BY date DESC LIMIT limit
```

Index: `userId ASC, date DESC`

#### Error cases

| Scenario | HTTP status |
|---|---|
| Invalid `limit` | 422 |
| Invalid `before` date format | 422 |

---

### 2.9 `GET /deadline`

**The problem:** The user needs to see not just their current deadline but the full history of why it changed. This transparency feature is what builds trust in the deadline engine. A user who sees "Deadline: Dec 15 (+3 days total)" without explanation will feel the system is arbitrary. A user who sees "Jun 10: +1 day (3 consecutive lazy days), Jun 17: +2 days (4 consecutive lazy days)" understands the system is honest.

#### Request

```
GET /deadline
Authorization: Bearer <firebase_id_token>
```

#### Response (HTTP 200)

```json
{
  "targetDate":       "2026-12-15",
  "originalDeadline": "2026-12-15",
  "daysLeft":         184,
  "paceStatus":       "on_track",
  "totalDaysDelta":   2,
  "adjustmentHistory": [
    {
      "id":                "adj_m2k8x9p1",
      "triggeredBy":       "nightly_job",
      "daysDelta":         2,
      "previousDeadline":  "2026-12-13",
      "newDeadline":       "2026-12-15",
      "reason":            "You missed 4 consecutive days of focused work. Deadline extended by 2 days.",
      "computedAt":        "2026-06-13T23:00:00Z"
    }
  ],
  "phaseGateStatus": {
    "currentPhase":    1,
    "gateRequirements": {
      "problemsRequired": 60,
      "problemsSolved":   42,
      "reflectionsRequired": 28,
      "reflectionsLogged":   25
    },
    "gateMet": false,
    "blockedMessage": "Phase 1 gate: 18 more problems and 3 more weekly reflections needed."
  }
}
```

#### Firestore reads

1. `users/{uid}` — targetDate, originalDeadline, startDate, currentPhase, totalProblemsLogged
2. `deadlineAdjustments` query — `userId == uid ORDER BY computedAt DESC LIMIT 10`
3. `reflections` query — `userId == uid AND date >= phaseStartDate` (count for gate check)

#### Business logic

`totalDaysDelta` = sum of all `daysDelta` values in adjustmentHistory. This is the "+3 / -1 days" number shown in the Profile screen's plan section.

`phaseGateStatus` provides the Progress screen's "Gate: 60 problems + 4 weeks reflections" display.

`daysLeft` = `(targetDate - today).days`.

#### Error cases

| Scenario | HTTP status |
|---|---|
| User document not found | 404 |
| Firestore read failure | 500 |

---

### 2.10 `POST /deadline/nightly` (Internal — Cloud Scheduler)

**The problem:** The deadline engine must run every night at 23:00 IST without human intervention. It must process all users who had activity in the past 7 days. It must be idempotent — if Cloud Scheduler fires twice on the same night (a known reliability characteristic of Cloud Scheduler at the free tier), running the job twice must produce the same result as running it once.

#### Request

```
POST /deadline/nightly
X-Scheduler-Token: <secret from Secret Manager>
Content-Type: application/json

{}
```

No Firebase token — this route is not user-facing. The `X-Scheduler-Token` header value is verified against the `SCHEDULER_SECRET` environment variable. Return HTTP 403 if missing or incorrect.

#### What the endpoint does (step by step)

```
1. Verify X-Scheduler-Token

2. Query users collection: all users where lastActiveDate >= 7 days ago
   (only process users with recent activity — skip inactive users for cost efficiency)

3. For each active user:
   a. Read reflections: userId == uid AND date >= 14 days ago (for consecutive day check)
   b. Read problems: userId == uid AND createdAt >= thisWeekMonday (weekly problem count)
   c. Read weeklySnapshots: latest 1 for this user (for target problem count)

   d. Run calculate_deadline_adjustment(input) — pure function, no I/O
      (see deadline_engine.py in architecture.md Section 4d for full algorithm)

   e. If days_delta == 0: skip — no write needed

   f. Idempotency check:
      Query deadlineAdjustments: userId == uid AND computedAt >= todayStart
      If adjustment already exists today: skip this user (already ran)

   g. Write deadlineAdjustments.doc(auto_id).set({...adjustment record...})

   h. Write users.doc(uid).update({targetDate: new_target, updatedAt: now})

4. Return HTTP 200 with summary: { usersProcessed, adjustmentsMade, usersSkipped }
```

#### Idempotency guarantee

The existence check in step (f) — querying for an adjustment with `computedAt >= todayStart` — ensures that if Cloud Scheduler fires twice in the same night, the second invocation does nothing for any user that was already processed. The first invocation writes the adjustment; the second sees it exists and skips. The `users.targetDate` is updated only once.

#### Response (HTTP 200)

```json
{
  "usersProcessed": 48,
  "adjustmentsMade": 7,
  "usersSkipped":   41,
  "processingTimeMs": 2840
}
```

This is logged but not shown to any user. Useful for debugging the scheduler run.

#### Error handling

If a single user's processing fails (Firestore error, deadline engine error), log the error with the uid and continue to the next user. Do not fail the entire batch. Return HTTP 200 with the partial result. This ensures one bad user document does not block 47 other users' deadline updates.

---

### 2.11 `GET /progress`

**The problem:** The Progress tab needs heatmap data (84 cells across 12 weeks), topic mastery bars (one per DSA pattern), weekly summary cards (12 weeks), and a phase progress bar. Computing all of this client-side from raw reflections and problems on every tab open would require 84+ document reads and significant computation. This endpoint pre-packages it.

#### Request

```
GET /progress
Authorization: Bearer <firebase_id_token>
```

#### Response (HTTP 200)

```json
{
  "phase": {
    "current":        1,
    "label":          "Phase 1 — Foundation Reset",
    "weekCurrent":    4,
    "weekTotal":      6,
    "progressPercent": 66,
    "gateMet":        false,
    "gateDescription": "Gate: 60 problems + 4 weeks reflections"
  },
  "heatmap": {
    "startDate": "2026-03-24",
    "endDate":   "2026-06-14",
    "cells": [
      { "date": "2026-03-24", "intensity": 0 },
      { "date": "2026-03-25", "intensity": 2 },
      ...
    ]
  },
  "topicMastery": [
    { "pattern": "arrays",       "solved": 12, "mastered": 12, "total": 12, "pct": 100 },
    { "pattern": "two-pointers", "solved": 8,  "mastered": 6,  "total": 8,  "pct": 75  },
    { "pattern": "stack",        "solved": 9,  "mastered": 5,  "total": 9,  "pct": 55  },
    { "pattern": "trees",        "solved": 4,  "mastered": 1,  "total": 4,  "pct": 25  },
    { "pattern": "graphs",       "solved": 1,  "mastered": 0,  "total": 1,  "pct": 10  },
    { "pattern": "dp",           "solved": 0,  "mastered": 0,  "total": 0,  "pct": 0   }
  ],
  "weeklySummaries": [
    {
      "weekId":        "2026-W24",
      "weekLabel":     "Week 4 (Jun 9–15)",
      "problems":      11,
      "systemDesign":  3,
      "reflections":   6,
      "avgRating":     3.8,
      "avgVerdict":    "surface",
      "verdictColor":  "#f59e0b",
      "deadlineChange": "none",
      "paceStatus":    "on_track"
    }
  ]
}
```

#### Firestore reads

1. `users/{uid}` — currentPhase, phaseStartDate, totalProblemsLogged
2. `weeklySnapshots` query — `userId == uid ORDER BY weekStartDate DESC LIMIT 12` — provides weeklySummaries and heatmap intensity data
3. `reflections` query — `userId == uid AND date >= 84_days_ago ORDER BY date ASC` — provides heatmap raw activity
4. `problems` query — `userId == uid` (all problems, no filter) — provides topicMastery breakdown

The heatmap requires raw reflection dates (not just snapshots) because it needs per-day granularity. Each cell's `intensity` is computed from whether the user submitted a reflection that day (0=none, 1=reflection only, 2=reflection + problems, 3=reflection + problems + high rating).

#### Why this endpoint is separate from `/dashboard`

The Progress tab is not loaded on app launch. It is loaded when the user taps the Progress tab — a separate navigation event. Loading all progress data on every app open (via `/dashboard`) would add 3 additional Firestore reads to a read that is already doing 6. Separating them means the Home screen is fast (6 reads, always loaded) and Progress is loaded on demand (4 reads, loaded only when needed).

#### Error cases

| Scenario | HTTP status |
|---|---|
| User document not found | 404 |
| Firestore read failure | 500 |

---

## Section 3 — Design Decisions Summary Table

| Decision | Alternative Considered | Why We Chose This | Trade-off Accepted |
|---|---|---|---|
| **Firestore vs PostgreSQL** | Supabase (PostgreSQL + PostgREST) | Firestore's free tier (50K reads/day, 1GB) comfortably handles 200 MAU. PostgreSQL on Cloud SQL has no free tier — minimum $7/month. Client-side Firestore real-time listeners eliminate the need for WebSockets entirely. | Firestore's query flexibility is weaker than SQL. No JOINs, no GROUP BY, no aggregations. All aggregations must be pre-computed or done in application code. |
| **Top-level collections vs subcollections** | All entities as subcollections of users/ | Top-level collections enable collection group queries for analytics. Security is equivalent — both approaches scope reads to `userId == request.auth.uid`. Subcollections offer no read-cost advantage. | Slightly more verbose Firestore paths. |
| **Date string as reflection document ID** | Auto-generated ID + query for today's reflection | O(1) existence check (doc get by ID) vs O(N) query + read. Enforces one reflection per user per day at the database layer — no application-level uniqueness enforcement needed. | Document IDs are predictable (guessable), but Firestore security rules handle unauthorized access — ID predictability is not a vulnerability here. |
| **Two-step reflection + AI flow (POST /reflections then POST /ai/coach)** | Bundle AI evaluation into POST /reflections | Reflection is saved instantly (200ms). AI evaluation can take 1-3 seconds — user never blocks on Gemini. If Gemini is unavailable, the reflection is already persisted. Clean separation of concerns. | Client must make two network calls per reflection submission. Extra code on client side. Acceptable because the second call (AI coach) is non-blocking from the user's perspective. |
| **Rule-based pre-screen before Gemini** | Call Gemini for all reflections | Most early-week reflections are vague. Pre-screening eliminates ~40% of Gemini calls for zero quality loss. Protects budget and reduces average endpoint latency. | Pre-screen has false negatives — a technically vague but genuinely deep reflection might get a hardcoded response. Mitigated by the broad keyword list. |
| **Denormalized streakCount on user document** | Compute streak from reflections collection on every read | 1 read (user doc) vs 7+ reads (7 days of reflections). At 30 DAU, that is 210 extra reads per day just for streaks. The counter is updated atomically using lastActiveDate for idempotency. | Counter can be off by 1 if a write partially fails. Self-correcting on next write. Accepted as non-critical (streak display is cosmetic, not financial). |
| **Weekly snapshots pre-computed by Cloud Scheduler** | Compute progress analytics on-demand in GET /progress | Progress tab requires 84 days of data. On-demand computation requires 84 reflection reads + N problem reads. Pre-computed snapshots reduce this to 12 reads. | Snapshots are up to 7 days stale for the current week. Acceptable — Progress is an analytics view, not a real-time dashboard. |
| **FastAPI vs Express (Node)** | Express.js with TypeScript | Python has the strongest Gemini SDK and Firebase Admin SDK support. The deadline engine is pure Python arithmetic with the `datetime` module. Type safety via Pydantic is equivalent to TypeScript interfaces. FastAPI's async/await + Depends() pattern maps cleanly to the multi-read dashboard aggregation. | Python cold starts on Cloud Run are slightly slower than Node (~2.5s vs ~1.5s for a fresh container). Acceptable at this scale (most requests hit warm instances). |
| **Cloud Run vs Cloud Functions** | Cloud Functions (2nd gen) triggered by HTTP | Cloud Run gives full control over the FastAPI process, connection pooling, and cold start behavior. Cloud Functions wrap a single function per endpoint — would require 15 separate function deployments. Cloud Run is one container, one deployment, zero routing configuration. | Cloud Run has higher minimum cold start time (~2s) vs Cloud Functions (~1s). Cloud Run minimum instance cost is $0 (min-instances=0). No practical cost difference at this scale. |
| **Slug-level baseline snapshot vs count-delta corroboration** | Count-delta (store only aggregate totals at enrollment) | The alfa-leetcode-api (`/:username/acSubmission?limit=N`) returns individual `titleSlug` + Unix `timestamp` per accepted submission. This makes slug-level diffing possible and eliminates the "pre-existing solve" ambiguity entirely. Storing baseline slugs costs ~30KB per user document — well within Firestore's 1MB limit even for a user with 1000 prior solves. | Fetching all accepted submissions at connect time can be a slow call for users with 500+ solves. Mitigated by the 5-second timeout (connect is a one-time action). The slug array is stored in a separate `leetcodeBaseline/{uid}` document to keep the main integration document lean. |
| **On-demand LeetCode sync vs Cloud Scheduler polling** | Scheduled daily poll of every connected user's LeetCode profile | At 100 MAU with 20% LeetCode-connected (20 users), a scheduled poll adds 20 external HTTP calls per day to a third-party unofficial API with no SLA. On-demand sync (user triggers it, or triggered on app open with a 6-hour cooldown) limits blast radius if the unofficial API goes down. Cost: 0 additional Cloud Scheduler jobs. | Solve count may be stale between user-triggered syncs. Acceptable — LeetCode data is a verification layer, not a real-time feed. Reflections remain the primary source of truth. |
| **Slug-based verified solves log vs auto-creating problem documents** | Auto-create a `problems` document for every new verified LeetCode slug | We know *which* problems were solved on LeetCode but not *how* (hints used? brute force? optimal approach?). Auto-creating problem docs without `solvedIndependently`, `notes`, or `pattern` fields would create low-quality tracking data and undermine the SRS system. Instead, verified solves are recorded in `leetcodeVerifiedSolves/{uid}` and the client prompts the user to log them properly. | Users who solve many problems on LeetCode must manually log them into PrepSDE's tracker. This friction is intentional — it forces the reflection step that makes SRS useful. |
| **Timestamp-based filtering (plan start date) vs slug-set diff** | Use only the baseline slug set diff (ignore timestamps entirely) | Using the submission `timestamp` against `plan.startDate` as the primary filter is the cleanest signal: any submission with `timestamp > plan_start_unix` is a PrepSDE-era solve, regardless of whether we have a baseline. The slug diff is a secondary consistency check. Combining both gives the most accurate creditable-solve count. | Requires storing `plan.startDate` as a Unix timestamp on the integration document for fast comparison. One extra field, zero extra reads. |

---

## Section 4 — LeetCode Integration

---

### 4.0 Context: What the alfa-leetcode-api Returns

The integration is built on the **alfa-leetcode-api** (https://github.com/alfaarghya/alfa-leetcode-api), deployed publicly at `https://alfa-leetcode-api.onrender.com/`. It is an unofficial, community-maintained scraper of LeetCode's public GraphQL API.

**Endpoints PrepSDE uses:**

| Endpoint | Returns |
|---|---|
| `GET /:username/acSubmission?limit=N` | Array of accepted submissions with slug + timestamp |
| `GET /:username/progress` | Aggregate accepted counts by difficulty |

**Exact response shapes (verified by live API call, 2026-06-14):**

`GET /alfaarghya/acSubmission?limit=3`:
```json
{
  "count": 3,
  "submission": [
    {
      "title":         "Set Matrix Zeroes",
      "titleSlug":     "set-matrix-zeroes",
      "timestamp":     "1764614391",
      "statusDisplay": "Accepted",
      "lang":          "java"
    }
  ]
}
```

`GET /alfaarghya/progress`:
```json
{
  "numAcceptedQuestions": [
    {"count": 200, "difficulty": "EASY"},
    {"count": 288, "difficulty": "MEDIUM"},
    {"count": 52,  "difficulty": "HARD"}
  ],
  "numFailedQuestions": [...],
  "numUntouchedQuestions": [...],
  "userSessionBeatsPercentage": [...]
}
```

**Critical capability this unlocks:** The `/:username/acSubmission?limit=N` endpoint returns `titleSlug` (the exact LeetCode problem identifier) and `timestamp` (Unix epoch of the solve). This makes slug-level baseline snapshots and timestamp-based filtering possible — the "pre-existing solve" problem is solvable at the data layer.

**Risk profile:** This is an unofficial API deployed on Render's free tier. It has no SLA, no authentication, no documented rate limits, and could go offline or change response shape without notice. It has been confirmed to return 404 for nonexistent usernames and has a response time of approximately 0.5-2 seconds for recent submission queries. The app must degrade gracefully when it is unavailable. All of PrepSDE's core features — reflections, problem tracking, AI coach, deadline engine — are independent of this API.

---

### 4.1 The Core Problem: Pre-Existing Solves

LeetCode profiles are cumulative. A user who solved 200 problems before starting their PrepSDE plan and then solves 10 more during the plan has a total of 210 solves. Without a baseline capture, we cannot distinguish the 10 PrepSDE-era solves from the 200 pre-existing ones.

**The strategy this design uses:**

At `POST /integrations/leetcode/connect`, fetch the user's full accepted submission history and store the complete set of `titleSlug` values as a frozen baseline snapshot. Any slug not in this set that appears in a future sync = a new solve that occurred after the user connected PrepSDE.

A secondary filter is applied on top: only submissions with `timestamp > plan_start_unix` are eligible as PrepSDE-creditable solves. This handles edge cases where the user connects PrepSDE after having already solved some problems during their plan period on LeetCode (before connecting the integration).

The combination of slug-set diff and timestamp filter gives the most precise creditable-solve signal available without requiring LeetCode authentication.

---

### 4.2 Firestore Collections for LeetCode Integration

Two collections are used: one lean status document and one baseline snapshot document. They are split because the baseline slug array can be large (users with 500+ prior solves) — keeping it out of the status document prevents bloating reads that only need sync state.

---

#### 4.2a `leetcodeIntegrations/{uid}` — Integration Status

**Document ID:** Firebase UID (same pattern as `streaks/{uid}`)

##### Schema

```json
{
  "uid":                   "abc123xyz",
  "leetcodeUsername":      "roshan_codes",
  "connectedAt":           "2026-06-14T10:00:00Z",
  "planStartUnix":         1749859200,
  "baselineCapturedAt":    "2026-06-14T10:00:00Z",
  "baselineSlugCount":     150,
  "lastSyncAt":            "2026-06-14T16:00:00Z",
  "lastSyncStatus":        "success",
  "lastSyncErrorMessage":  null,
  "verifiedSolvesCount":   4,
  "verifiedEasy":          2,
  "verifiedMedium":        2,
  "verifiedHard":          0,
  "prepsdeProblemsSolved": 8,
  "gapMessage":            "LeetCode shows 4 verified new solves since your plan started. PrepSDE has 8 problems logged. You're logging more than LeetCode tracks — great.",
  "isActive":              true
}
```

##### Field-by-field rationale

| Field | Type | Why it exists |
|---|---|---|
| `uid` | string | Firebase UID, also the document ID. |
| `leetcodeUsername` | string | Public LeetCode username. Self-reported by user. Used as the path parameter in all API calls. |
| `connectedAt` | ISO datetime string | When the user first connected. Displayed on the Profile/Settings screen. |
| `planStartUnix` | integer | The user's `startDate` converted to Unix epoch at connect time. Stored here so the sync logic can compare submission timestamps without reading the user document. One field, zero extra reads per sync. |
| `baselineCapturedAt` | ISO datetime string | When the baseline snapshot was taken. Stored separately from `connectedAt` because the baseline API call may be retried. |
| `baselineSlugCount` | integer | The number of slugs in the baseline snapshot (stored in the companion `leetcodeBaseline/{uid}` document). Stored here for display: "Baseline: 150 problems solved before your plan." |
| `lastSyncAt` | ISO datetime string | Timestamp of the most recent sync attempt. Used for the 6-hour cooldown check and the "Last synced N hours ago" display. |
| `lastSyncStatus` | string enum: `success`, `api_error`, `user_not_found`, `rate_limited` | Outcome of most recent sync. Drives warning badge display: "api_error" or "user_not_found" shows a yellow badge on the integration card. |
| `lastSyncErrorMessage` | string, nullable | Raw error detail for debugging. Not surfaced to the user directly. |
| `verifiedSolvesCount` | integer | The count of LeetCode-verified new solves since plan start. This is the headline number: "You've verified 4 new solves on LeetCode since starting your plan." Updated on every successful sync. |
| `verifiedEasy`, `verifiedMedium`, `verifiedHard` | integers | Breakdown by difficulty of verified new solves. Displayed as a small stats line under the headline. |
| `prepsdeProblemsSolved` | integer | Snapshot of `users/{uid}.totalProblemsLogged` at last sync time. Stored here so the gap message can reference it without re-reading the user document on GET. |
| `gapMessage` | string | Pre-computed human-readable string comparing LeetCode-verified solves to PrepSDE-logged problems. Generated by the backend on each sync. Displayed directly on the integration card — no client-side logic needed. |
| `isActive` | boolean | `false` if the user disconnected. Soft delete — baseline data is preserved for reconnect. |

---

#### 4.2b `leetcodeBaseline/{uid}` — Slug Snapshot

**Document ID:** Firebase UID. Separate document to isolate the potentially large slug array from the lean status document.

##### Schema

```json
{
  "uid":              "abc123xyz",
  "capturedAt":       "2026-06-14T10:00:00Z",
  "slugs":            ["two-sum", "valid-parentheses", "best-time-to-buy-and-sell-stock", "..."],
  "slugCount":        150
}
```

##### Field-by-field rationale

| Field | Type | Why it exists |
|---|---|---|
| `uid` | string | Firebase UID, also the document ID. |
| `capturedAt` | ISO datetime string | When the snapshot was taken. Mirrors `baselineCapturedAt` on the status document for self-contained reads. |
| `slugs` | string[] | The complete list of `titleSlug` values the user had solved before connecting PrepSDE. This is the immutable baseline. Any slug in a future sync's acSubmission list that is NOT in this array is a new solve. **Never overwritten after initial connect.** |
| `slugCount` | integer | Denormalized length of `slugs`. Avoids reading the full array just to show the count. |

##### Size analysis

- Maximum realistic slug count: 1000 problems (very few users)
- Average slug length: 28 characters
- 1000 slugs × 28 chars = ~28KB
- Firestore maximum document size: 1MB
- Safety margin: 35x headroom

No users will hit the document size limit.

##### Why this is a separate collection, not embedded in `leetcodeIntegrations/{uid}`

The `leetcodeIntegrations` document is read on every sync to check status and cooldown. Reading 150 slugs (28KB) on every cooldown check is wasteful — the slugs are only needed during the actual diff computation. The separate `leetcodeBaseline` document is only read when a sync proceeds past the cooldown gate.

---

#### 4.2c `leetcodeVerifiedSolves/{uid}/solves/{titleSlug}` — Verified Solve Log

Individual verified solves are recorded in a subcollection of `leetcodeVerifiedSolves`. This is the one case in the PrepSDE schema where a subcollection is justified: there can be up to 150+ verified solve documents per user, and they are never queried together with other collections — they are always accessed as a group under a specific uid.

**Document ID:** `titleSlug` itself (e.g., `two-sum`). Natural key — there can be exactly one verified solve record per problem per user.

##### Schema

```json
{
  "titleSlug":         "merge-intervals",
  "title":             "Merge Intervals",
  "solvedAt":          "2026-06-14T15:30:00Z",
  "lcTimestamp":       1749910200,
  "lang":              "python3",
  "matchedProblemId":  "prob_k8x2m4n9",
  "promptedToLog":     false
}
```

##### Field-by-field rationale

| Field | Type | Why it exists |
|---|---|---|
| `titleSlug` | string | LeetCode's canonical problem identifier. Also the document ID. |
| `title` | string | Human-readable problem title. Stored so the "unsaved problems" prompt can show "It looks like you solved Merge Intervals on LeetCode — want to add it to your tracker?" without a separate API call. |
| `solvedAt` | ISO datetime string | Converted from `lcTimestamp` for display. |
| `lcTimestamp` | integer | Original Unix epoch from the acSubmission response. Preserved for debugging and for spaced repetition: if the user logs this problem in PrepSDE, the backend can optionally set `nextReviewDate` relative to the actual solve date rather than the log date. |
| `matchedProblemId` | string, nullable | If the user subsequently logs this problem in `problems/{id}`, this field is set to the PrepSDE problem ID. Enables the Profile screen to show "3 of your 4 LeetCode-verified solves are tracked in your PrepSDE log." |
| `promptedToLog` | boolean | Set to `true` once the "unsaved problems" prompt has been shown to the user for this slug. Prevents repeated prompting for the same problem. |

##### Access patterns

| Query | How | Index needed |
|---|---|---|
| All verified solves for a user | `leetcodeVerifiedSolves.doc(uid).collection("solves").get()` | None (full collection read) |
| Unmatched verified solves (for prompt) | `solves where matchedProblemId == null AND promptedToLog == false` | `matchedProblemId ASC, promptedToLog ASC` (subcollection composite index) |
| Check if slug already verified | `solves.doc(titleSlug).get()` | None (O(1) by document ID) |

---

### 4.3 `POST /integrations/leetcode/connect`

**What it does:** Accepts the user's LeetCode username, fetches their complete accepted submission history, stores the slug set as the baseline snapshot, and creates the integration status document.

#### Request

```
POST /integrations/leetcode/connect
Authorization: Bearer <firebase_id_token>
Content-Type: application/json

{
  "leetcodeUsername": "roshan_codes"
}
```

**Validation:**
- `leetcodeUsername`: required, 3-25 characters, alphanumeric plus hyphens/underscores (matches LeetCode's username pattern), normalized to lowercase before storing

#### What happens step by step

```
1. Verify Firebase ID token → extract uid

2. Check if leetcodeIntegrations/{uid} already exists with isActive=true
   → If yes: HTTP 409 "LeetCode account already connected.
     Use DELETE /integrations/leetcode to disconnect first."

3. Read users/{uid} to get plan startDate → convert to Unix epoch (planStartUnix)

4. Call alfa-leetcode-api:
   GET https://alfa-leetcode-api.onrender.com/{leetcodeUsername}/acSubmission?limit=5000
   → limit=5000 fetches up to 5000 accepted submissions (covers all but the most
     prolific users; anyone with >5000 solves is not a target user for PrepSDE)
   → Timeout: 10 seconds (larger payload, slightly longer timeout than sync)
   → On timeout or connection error:
       HTTP 503 "LeetCode API is currently unreachable. Try again later."
   → On HTTP 404 from the API:
       HTTP 404 "LeetCode username '{username}' not found. Check the spelling."
   → On HTTP 5xx from the API:
       HTTP 503 "LeetCode API returned an error. Try again later."

5. Parse response → extract array of { titleSlug, timestamp } objects
   → If parsing fails or "submission" key missing:
       HTTP 502 "Unexpected response from LeetCode API."
   → Validate: all titleSlug values are non-empty strings

6. Extract baseline slug set (ALL slugs, regardless of timestamp):
   baseline_slugs = [s["titleSlug"] for s in response["submission"]]
   baseline_count = len(baseline_slugs)

7. Write leetcodeBaseline/{uid}:
   {
     uid,
     capturedAt: now(),
     slugs: baseline_slugs,    ← immutable from this point forward
     slugCount: baseline_count
   }

8. Read users/{uid}.totalProblemsLogged → prepsde_count

9. Write leetcodeIntegrations/{uid}:
   {
     uid, leetcodeUsername,
     connectedAt: now(),
     planStartUnix: planStartUnix,
     baselineCapturedAt: now(),
     baselineSlugCount: baseline_count,
     lastSyncAt: now(),
     lastSyncStatus: "success",
     lastSyncErrorMessage: null,
     verifiedSolvesCount: 0,
     verifiedEasy: 0, verifiedMedium: 0, verifiedHard: 0,
     prepsdeProblemsSolved: prepsde_count,
     gapMessage: "Connected. Baseline captured: {baseline_count} problems solved before your plan.",
     isActive: true
   }

10. Return HTTP 201
```

**Why limit=5000 on connect:** The baseline needs to be complete. If a user has 300 prior solves and we only fetch 20, the baseline is incomplete and future syncs will incorrectly credit pre-existing solves. The 5000 limit is a safe ceiling — the API call is slower (typically 2-5 seconds for large histories) but connect is a one-time action, not a per-session call. The 10-second timeout reflects this.

**Why NOT filter by timestamp on connect:** The baseline should contain everything the user solved before PrepSDE, including problems solved during the plan period before connecting the integration. Timestamp filtering happens at sync time, not at baseline capture time.

#### Response (HTTP 201)

```json
{
  "leetcodeUsername":  "roshan_codes",
  "connectedAt":       "2026-06-14T10:00:00Z",
  "baselineSlugCount": 150,
  "message":           "Connected. Baseline captured: 150 problems solved before your PrepSDE plan."
}
```

#### Error cases

| Scenario | HTTP status | Response detail |
|---|---|---|
| Invalid username format | 422 | Pydantic validation error |
| Already connected (isActive=true) | 409 | "LeetCode account already connected" |
| LeetCode API timeout | 503 | "LeetCode API is currently unreachable" |
| Username not found on LeetCode | 404 | "LeetCode username '{username}' not found" |
| LeetCode API 5xx | 503 | "LeetCode API returned an error" |
| Malformed API response | 502 | "Unexpected response from LeetCode API" |
| User document not found (no plan) | 400 | "Complete onboarding before connecting LeetCode" |

#### The baseline is immutable

The `leetcodeBaseline/{uid}` document is written exactly once. No sync operation ever modifies it. Even `DELETE /integrations/leetcode` (disconnect) does not delete the baseline document — it only sets `isActive=false` on the status document. If the user reconnects, a new baseline is captured by overwriting both documents.

---

### 4.4 `POST /integrations/leetcode/sync`

**What it does:** Fetches recent accepted submissions from the alfa-leetcode-api, diffs them against the stored baseline and the plan start timestamp, records newly verified solves, and updates the integration status document.

#### Request

```
POST /integrations/leetcode/sync
Authorization: Bearer <firebase_id_token>
Body: none (or empty JSON {})
```

#### Sync cooldown

Syncs are throttled to once per 6 hours per user to protect the unofficial API from abuse:

```
if (now - lastSyncAt) < 6 hours:
    return HTTP 429 {
        "detail": "Sync is limited to once per 6 hours.",
        "nextSyncAvailableAt": "<ISO datetime>"
    }
```

#### What happens step by step

```
1. Verify Firebase ID token → extract uid

2. Read leetcodeIntegrations/{uid}
   → If not found or isActive=false: HTTP 404 "No LeetCode account connected."

3. Check cooldown: (now - lastSyncAt) < 6 hours → HTTP 429

4. Read leetcodeBaseline/{uid} → baseline_slugs (Set for O(1) lookup)

5. Call alfa-leetcode-api:
   GET https://alfa-leetcode-api.onrender.com/{leetcodeUsername}/acSubmission?limit=500
   (500 submissions covers ~6 months of active solving for most users)
   → Timeout: 5 seconds
   → On any API error (timeout, 5xx, malformed response):
       a. Update leetcodeIntegrations/{uid}:
          { lastSyncAt: now(), lastSyncStatus: "api_error",
            lastSyncErrorMessage: <detail> }
       b. Return HTTP 200 with lastSyncStatus: "api_error"
          and the last-known verifiedSolvesCount
       (The app shows stale data with a warning badge. This is not a PrepSDE error.)
   → On HTTP 404:
       a. Update lastSyncStatus: "user_not_found"
       b. Return HTTP 200

6. Parse { "submission": [...] }

7. Compute verified new solves (the core algorithm):

   verified_new = []
   for submission in response["submission"]:
       slug      = submission["titleSlug"]
       timestamp = int(submission["timestamp"])

       # Primary filter: only count solves AFTER plan start
       if timestamp <= planStartUnix:
           continue

       # Secondary filter: only count solves NOT in the baseline
       # (catches edge case: user solved this problem before the plan started
       # AND before they connected the integration — the timestamp filter
       # already handles this, but the slug check is a belt-and-suspenders guard)
       if slug in baseline_slugs:
           continue

       verified_new.append({
           "titleSlug": slug,
           "title":     submission["title"],
           "timestamp": timestamp,
           "lang":      submission["lang"]
       })

   # Deduplicate: a user may have resubmitted the same problem
   # Use a dict keyed by titleSlug, keeping the earliest timestamp
   seen = {}
   for s in verified_new:
       if s["titleSlug"] not in seen:
           seen[s["titleSlug"]] = s
       else:
           if s["timestamp"] < seen[s["titleSlug"]]["timestamp"]:
               seen[s["titleSlug"]] = s
   deduplicated_new = list(seen.values())

8. Cross-reference with existing leetcodeVerifiedSolves/{uid}/solves/
   → Check which slugs are already recorded (to avoid double-writes)
   → Only process truly new slugs

9. For each new verified solve:
   Write leetcodeVerifiedSolves/{uid}/solves/{titleSlug}:
   {
     titleSlug, title,
     solvedAt: datetime.fromtimestamp(timestamp, tz=timezone.utc).isoformat(),
     lcTimestamp: timestamp,
     lang,
     matchedProblemId: null,
     promptedToLog: false
   }

10. Fetch difficulty breakdown for new solves:
    Call alfa-leetcode-api: GET /{leetcodeUsername}/progress
    → Extract numAcceptedQuestions per difficulty
    → Compute verifiedEasy, verifiedMedium, verifiedHard by cross-referencing
      problem difficulty. Since the acSubmission response does not include
      difficulty, use the aggregate progress counts as a proxy:
      verifiedEasy   = max(0, progressEasy   - baselineEasy_from_progress)
      verifiedMedium = max(0, progressMedium - baselineMedium_from_progress)
      verifiedHard   = max(0, progressHard   - baselineHard_from_progress)
    → If this call fails: use len(deduplicated_new) as total, leave breakdown as {0,0,0}
    → Store baseline difficulty counts on connect for this comparison (see 4.3 step 9 addition below)

11. Read users/{uid}.totalProblemsLogged → prepsde_count

12. Generate gap message (see generate_gap_message() below)

13. Update leetcodeIntegrations/{uid}:
    {
      lastSyncAt:            now(),
      lastSyncStatus:        "success",
      lastSyncErrorMessage:  null,
      verifiedSolvesCount:   len(seen),      ← total deduplicated verified solves to date
      verifiedEasy:          verifiedEasy,
      verifiedMedium:        verifiedMedium,
      verifiedHard:          verifiedHard,
      prepsdeProblemsSolved: prepsde_count,
      gapMessage:            gap_message
    }

14. Return HTTP 200 with full state
```

**Note on baseline difficulty counts:** Step 10 requires baseline difficulty counts (easy/medium/hard totals at connect time). Add these three fields to the `leetcodeIntegrations` schema and populate them during `POST /integrations/leetcode/connect` by calling `GET /:username/progress` (a second API call at connect time). This gives accurate difficulty breakdowns without per-slug difficulty lookups.

#### Gap message logic

```python
def generate_gap_message(lc_verified: int, prepsde_logged: int) -> str:
    gap = lc_verified - prepsde_logged
    if gap > 5:
        return (
            f"LeetCode shows {lc_verified} verified new solves since your plan started, "
            f"but PrepSDE only has {prepsde_logged} logged. "
            f"Consider adding the {gap} missing problems to your tracker."
        )
    elif gap < -5:
        return (
            f"You've logged {prepsde_logged} problems in PrepSDE but LeetCode only "
            f"shows {lc_verified} verified new solves. This is normal if you're "
            f"practicing concepts without submitting on LeetCode."
        )
    else:
        return (
            f"LeetCode shows {lc_verified} verified new solves since your plan started. "
            f"PrepSDE has {prepsde_logged} problems logged. Counts are consistent."
        )
```

#### Response (HTTP 200 — successful sync)

```json
{
  "lastSyncAt":            "2026-06-14T16:00:00Z",
  "lastSyncStatus":        "success",
  "verifiedSolvesCount":   4,
  "verifiedByDifficulty": {
    "easy":   2,
    "medium": 2,
    "hard":   0
  },
  "newSolvesThisSync": [
    {
      "titleSlug":    "merge-intervals",
      "title":        "Merge Intervals",
      "solvedAt":     "2026-06-13T14:30:00Z",
      "lang":         "python3",
      "alreadyInLog": false
    },
    {
      "titleSlug":    "jump-game",
      "title":        "Jump Game",
      "solvedAt":     "2026-06-13T16:45:00Z",
      "lang":         "python3",
      "alreadyInLog": true
    }
  ],
  "prepsdeProblemsSolved": 8,
  "gapMessage": "LeetCode shows 4 verified new solves since your plan started. PrepSDE has 8 problems logged. Counts are consistent."
}
```

The `alreadyInLog` field on each new solve is `true` if a problem with a matching `url` containing the `titleSlug` already exists in `problems/{id}` for this user. This is computed by a single Firestore query: `problems where userId == uid AND url contains titleSlug`. If this query is too expensive (requires a full-text index), fall back to setting `alreadyInLog: false` for all — the "add to tracker" prompt will show for already-logged problems as well, which is acceptable.

#### Response (HTTP 200 — API error, graceful degradation)

```json
{
  "lastSyncAt":          "2026-06-14T16:00:00Z",
  "lastSyncStatus":      "api_error",
  "verifiedSolvesCount": 4,
  "verifiedByDifficulty": {
    "easy":   2,
    "medium": 2,
    "hard":   0
  },
  "newSolvesThisSync": [],
  "prepsdeProblemsSolved": 8,
  "gapMessage": "LeetCode sync failed. Showing last known data from 2026-06-14T10:00:00Z."
}
```

#### Error cases

| Scenario | HTTP status | Behavior |
|---|---|---|
| No LeetCode account connected | 404 | — |
| Sync cooldown active | 429 | `nextSyncAvailableAt` in response |
| LeetCode API timeout or 5xx | 200 | `lastSyncStatus: "api_error"`, stale counts returned |
| LeetCode username not found | 200 | `lastSyncStatus: "user_not_found"`, stale counts returned |
| Malformed API response | 200 | Treated as `api_error`, logged at ERROR level |

---

### 4.5 `GET /integrations/leetcode`

**What it does:** Returns the current LeetCode integration state for the Profile or Settings screen.

#### Request

```
GET /integrations/leetcode
Authorization: Bearer <firebase_id_token>
```

#### Response (HTTP 200 — connected)

```json
{
  "connected":             true,
  "leetcodeUsername":      "roshan_codes",
  "connectedAt":           "2026-06-14T10:00:00Z",
  "baselineSlugCount":     150,
  "lastSyncAt":            "2026-06-14T16:00:00Z",
  "lastSyncStatus":        "success",
  "verifiedSolvesCount":   4,
  "verifiedByDifficulty": {
    "easy":   2,
    "medium": 2,
    "hard":   0
  },
  "prepsdeProblemsSolved": 8,
  "gapMessage":            "LeetCode shows 4 verified new solves since your plan started. PrepSDE has 8 problems logged. Counts are consistent.",
  "nextSyncAvailableAt":   "2026-06-14T22:00:00Z"
}
```

#### Response (HTTP 200 — not connected)

```json
{
  "connected": false
}
```

This endpoint always returns HTTP 200. The client reads `connected` to decide whether to show the "Connect LeetCode" prompt or the sync status card.

#### Firestore reads

1. `leetcodeIntegrations/{uid}.get()` — O(1), single document read

The `leetcodeBaseline` document is NOT read by this endpoint (the slugs are not needed for display).

---

### 4.6 `GET /integrations/leetcode/verified-solves`

**What it does:** Returns the list of all LeetCode-verified new solves for this user. Used by the "unsaved problems" prompt: shows which problems the user solved on LeetCode but has not logged in PrepSDE.

#### Request

```
GET /integrations/leetcode/verified-solves?unlogged=true
Authorization: Bearer <firebase_id_token>
```

**Query parameters:**

| Param | Default | Description |
|---|---|---|
| `unlogged` | `false` | If `true`, return only solves where `matchedProblemId == null AND promptedToLog == false` |
| `limit` | 20 | Max results |

#### Response (HTTP 200)

```json
{
  "verifiedSolves": [
    {
      "titleSlug":      "merge-intervals",
      "title":          "Merge Intervals",
      "solvedAt":       "2026-06-13T14:30:00Z",
      "lang":           "python3",
      "matchedProblemId": null,
      "promptedToLog":  false
    }
  ],
  "total": 4,
  "unloggedCount": 2
}
```

#### Firestore reads

1. `leetcodeVerifiedSolves/{uid}/solves` subcollection query

---

### 4.7 `DELETE /integrations/leetcode`

**What it does:** Soft-disconnects the LeetCode integration.

#### Request

```
DELETE /integrations/leetcode
Authorization: Bearer <firebase_id_token>
```

#### Response (HTTP 200)

```json
{
  "message": "LeetCode account disconnected. Your verified solves and baseline are preserved."
}
```

Sets `isActive=false` on `leetcodeIntegrations/{uid}`. The `leetcodeBaseline/{uid}` and all `leetcodeVerifiedSolves/{uid}/solves/*` documents are preserved. If the user reconnects later, a fresh connect overwrites the integration status and baseline documents (the verified solves subcollection is also cleared during reconnect to avoid mixing old and new plan data).

---

### 4.8 How Verified Solves Interact with the Problem Tracker

The verified solves system is a read-only verification layer. It influences the problem tracker through user-initiated actions only, never automatically.

**What verified solves DO:**
- Record evidence that the user solved a specific problem on LeetCode after their plan started
- Surface an "unsaved problems" prompt listing problems solved on LeetCode but not in PrepSDE
- Allow the `GET /integrations/leetcode/verified-solves?unlogged=true` endpoint to drive the prompt UI
- Set `matchedProblemId` on the verified solve document when the user subsequently logs the problem in PrepSDE (this linking is done during `POST /problems` by checking if a verified solve exists for the same slug)

**What verified solves do NOT do:**
- Do not auto-create `problems` documents (user must explicitly log)
- Do not modify `solvedIndependently` — user must self-report how they solved it
- Do not modify `nextReviewDate` — SRS is driven by PrepSDE's tracking, not LeetCode timestamps
- Do not update `users.totalProblemsLogged`
- Do not affect the streak
- Do not influence the deadline engine
- Do not change any AI coach verdict

**The optional integration with `POST /problems`:**

When a user logs a new problem via `POST /problems`, the backend checks `leetcodeVerifiedSolves/{uid}/solves/{titleSlug}` (derived from the problem URL if provided). If a verified solve exists:
1. Set `matchedProblemId = problem.id` on the verified solve document
2. Optionally: pre-fill `nextReviewDate` using the verified solve's `lcTimestamp` as the solve date (rather than today). This gives the user credit for the time elapsed since they actually solved it. For example, if they solved it 4 days ago, `nextReviewDate = today - 4 + 7 = today + 3` days instead of today + 3.

This optional SRS pre-fill is the one place where LeetCode data influences problem tracking — and only when the user explicitly logs the problem themselves.

---

### 4.9 Graceful Degradation — API Unavailability

The alfa-leetcode-api runs on Render's free tier and can go offline at any time. The PrepSDE app is fully functional without it.

| State | PrepSDE behavior |
|---|---|
| API times out on connect | HTTP 503 returned, user prompted to retry later |
| API times out on sync | HTTP 200 returned with `lastSyncStatus: "api_error"`, stale data shown with warning badge |
| API returns 404 for username | `lastSyncStatus: "user_not_found"`, prompt user to verify username in settings |
| API returns malformed JSON | Logged at ERROR level, treated as `api_error` |
| LeetCode removes a problem | Slug disappears from future acSubmission responses but `leetcodeVerifiedSolves` record is preserved |
| User never connects LeetCode | All `/integrations/leetcode` endpoints return `{ connected: false }`. No other feature is affected. |

**Core principle:** The LeetCode integration is additive corroboration. PrepSDE's problem tracker, reflections, AI coach, streak, and deadline engine are all completely independent of LeetCode API availability. A user who never connects LeetCode loses nothing except the verification dashboard card.

---

### 4.10 Privacy Considerations

- LeetCode usernames are public by default on LeetCode. Storing the username in Firestore is equivalent to the user writing it on their settings page.
- The integration is **strictly opt-in**. Users who dismiss the connect prompt once can set `hideConnectLeetcodePrompt: true` on their user document — one boolean field, no separate collection, no repeated prompting.
- PrepSDE stores no LeetCode credentials, session cookies, or authentication tokens of any kind. The alfa-leetcode-api uses only public profile data accessible without login.
- All verified solve data is scoped to the user's own UID and is only accessible via the authenticated backend — the client never reads `leetcodeVerifiedSolves` directly.
- The `leetcodeBaseline/{uid}` document contains the user's historical LeetCode solve history as a slug list. This is sensitive personal data and is covered by the same Firestore security rules as all other user data: the backend's service account is the only writer, and the document is readable only by the owning uid.

---

### 4.11 Composite Indexes for LeetCode Integration

New composite indexes required in `firestore.indexes.json`:

| Collection | Fields | Query that needs it |
|---|---|---|
| `leetcodeVerifiedSolves/{uid}/solves` | `matchedProblemId ASC, promptedToLog ASC` | `GET /integrations/leetcode/verified-solves?unlogged=true` |

All other LeetCode integration access is by document ID (O(1) get operations). The `leetcodeIntegrations` and `leetcodeBaseline` collections require no composite indexes.

---

### 4.12 Free Tier Cost Impact

| Action | Reads | Writes | Frequency |
|---|---|---|---|
| `POST /integrations/leetcode/connect` | 2 (existence check + user doc for planStartUnix) | 2 (create integration doc + baseline doc) | Once per user |
| `POST /integrations/leetcode/sync` | 3 (integration doc + baseline doc + user doc) | 1-N (integration doc + 1 per new verified solve) | Max 4/day per connected user |
| `GET /integrations/leetcode` | 1 (integration doc only) | 0 | Once per Profile screen open |
| `GET /integrations/leetcode/verified-solves` | N (subcollection query) | 0 | On-demand |
| `DELETE /integrations/leetcode` | 1 | 1 | Rare |

At 20 LeetCode-connected users (20% of 100 MAU) with 4 syncs/day:
- Reads: 20 × 4 × 3 = 240/day
- Writes: 20 × 4 × 2 (avg) = 160/day (integration doc + occasional new verified solve)

This is under 0.5% of daily free tier limits. Negligible.

**External API call budget:** The unofficial API is called at most twice per sync (acSubmission + progress). At 20 users × 4 syncs/day = 80 external HTTP calls/day to the alfa-leetcode-api. At no GCP cost.

---

### 4.13 Updated API Endpoint Reference (LeetCode Integration)

All require `Authorization: Bearer <firebase_id_token>`.

| Method | Path | Description |
|---|---|---|
| POST | `/integrations/leetcode/connect` | Connect LeetCode username, capture baseline slug snapshot |
| POST | `/integrations/leetcode/sync` | Fetch new solves, diff against baseline, record verified solves |
| GET | `/integrations/leetcode` | Get integration status for Profile/Settings screen |
| GET | `/integrations/leetcode/verified-solves` | List verified new solves (with `?unlogged=true` filter) |
| DELETE | `/integrations/leetcode` | Soft-disconnect, preserve baseline and verified solves |
