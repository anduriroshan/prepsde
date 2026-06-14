# PrepSDE Platform — Feature Backlog

> Draft for review. Add comments, strike out what you don't want, or suggest changes.

---

## Core (Port from Existing PWA)

- [ ] Google Sign-in (Firebase Auth) — replace localStorage with per-user cloud sync
- [ ] DSA Tracker with 3-7-15 spaced repetition — synced across devices
- [ ] Daily reflection journal — text entry with mood/rating
- [ ] Streak tracking + heatmap (GitHub-style activity calendar)
- [ ] 24-week automated task board (phase-based daily checklists)
- [ ] Email/push reminders for daily tasks

---

## AI Coach (Upgrade from Current)

- [ ] **BS Detector** — grades reflections: 🟢 Deep Work / 🟡 Surface / 🔴 Lazy
  - If 3 red days in a row → auto-surface a 5-min micro-lesson
  - If reflection is nonsensical ("goog, ok, dsa") → call it out and teach something anyway
- [ ] **Micro-lesson engine** — when user hasn't been productive, show:
  - A real-world engineering story (e.g. "How Uber built their rate limiter")
  - A system design concept relevant to their current week in the plan
  - A short article or video link
- [ ] **Dynamic Deadline Engine** *(new core feature)* — user sets a target date (e.g. 6 months). Shown on home screen as "X days left".
  - If user has 2+ consecutive days with 🔴 Lazy reflections or no activity → deadline extends by 1-2 days with a plain-English explanation: *"You missed 2 days of focused work. Deadline moved Dec 15 → Dec 17. Cover X and Y this week to recover."
  - If user completes more than the weekly target (extra problems, extra system design topics) → deadline can shrink with an explanation
  - Adjustments are capped (can't shrink by more than 2 days/week, can't extend by more than 3 days/week) to prevent gaming or panic
- [ ] **Weekly Pace Score** — every Sunday, a simple on-track indicator on the dashboard
  - 🟢 Ahead / 🟡 On Track / 🔴 Behind — based on problems solved, topics covered, reflection quality that week
  - Shows: "This week: planned 10 problems, solved 13. You're 3 days ahead."
- [ ] **Recovery Plan** — when the deadline extends, AI doesn't just explain why; it generates a specific 2-day plan
  - "Day 1: Solve these 3 problems (links). Day 2: Read this system design concept (link). This brings you back on track."
- [ ] **Phase Gate Check** — before auto-progressing from Phase 1 → 2 → 3, minimum criteria must be met
  - Example: Phase 1 gate = 60+ problems logged + at least 4 weeks of reflections with avg score 🟡 or above
  - If gate not met, deadline adjusts and user is shown what's blocking them

---

## Social / Accountability

- [ ] **Accountability Pods** — groups of 3-5 users
  - Matched by target company, role level, or prep stage
  - Weekly leaderboard within the pod (streak, problems solved, reflection score)
  - Opt-in shared reflections (others can see your weekly summary, not daily)
- [ ] **Weekly Summary Card** — auto-generated every Sunday inside the app (not for sharing yet)
  - Shows: problems solved, topics covered, reflection score trend, deadline change (if any)
  - Visible in the Reflections or Progress view as a weekly recap

---

## Content & Learning

- [ ] **Real-World Engineering Stories Feed**
  - Curated articles: "How Slack handles message ordering", "Netflix Chaos Engineering", "Uber's rate limiter"
  - Linked to the system design topic the user is studying that week
  - New story surfaced each day
- [ ] **Concept Map / Skill Tree**
  - Visual graph of topic dependencies
  - "You've unlocked: Hashing → Two Pointers → Sliding Window. Next: Monotonic Stack"
  - Shows mastered vs in-progress vs locked topics
- [ ] **Pattern Notebook** (digital version of the physical notebook in the plan)
  - Per-pattern page: name, when to use, template code, linked problems
  - Auto-populated when user logs a problem with a pattern tag

---

## Progress & Analytics

- [ ] Per-topic mastery percentage
- [ ] Weekly reflection score trend (AI verdict over time)
- [ ] NeetCode 150 completion tracker (already partially exists)
- [ ] Time-to-mastery per DSA pattern
- [ ] Projected readiness date based on current pace — feeds directly into the Dynamic Deadline Engine
- [ ] Weekly plan vs actual comparison (planned topics vs what was actually covered)

---

## Platform / Infrastructure

- [ ] Multi-device sync (Firestore — replaces localStorage)
- [ ] Offline support (keep PWA cache-first, sync when online)
- [ ] Flutter mobile app (Android + iOS) sharing the same Firebase backend
- [ ] Web (Next.js PWA) — uniform design tokens across both
- [ ] Cloud Run backend (FastAPI) — Gemini proxy, business logic, scheduled jobs
- [ ] Firebase Cloud Messaging — push notifications
- [ ] Server-side Gemini API key (never exposed to client)

---

## Design System (Cross-Platform Uniformity)

- [ ] Single `design-tokens.json` as source of truth
  - Colors, typography, spacing, border radius, shadows, motion
  - Consumed by: Tailwind config (web) + Flutter ThemeData (mobile)
- [ ] Dark-first design (current aesthetic: deep black + indigo accent)
- [ ] Glassmorphic cards, consistent across web and mobile

---

## What We Are NOT Building (Yet)

- Code execution environment (use LeetCode, link out)
- Video hosting (embed YouTube / NeetCode)
- Public comment feeds (too much moderation — pods only)
- Teach-Back / Feynman mode — revisit when voice input decision is made
- Learning decay alerts — replaced by the Dynamic Deadline Engine (same intent, better UX)

---

## Open Questions (Decide Before Building)

1. Flutter or React Native (Expo) for mobile?
2. Should Accountability Pods be invite-only or matchmade?
3. Should the Real-World Stories Feed be curated manually (more trustworthy) or AI-generated (scales better)?
4. Free tier limits — how many users before we need to charge?
5. Dynamic Deadline — should users be able to override/reject the AI's deadline change, or is it enforced?
6. Phase Gate — hard block (can't proceed until criteria met) or soft warning (can proceed but AI flags it)?
