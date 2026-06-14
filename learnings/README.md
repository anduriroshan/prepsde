# 📚 PrepSDE — Learnings

This folder exists because AI can build things fast, but **you** need to be the one who understands every decision, every trade-off, and every "why not" behind this project.

Each file covers one major topic. Read them in order for a full understanding, or jump to any file when you need to go deep on a specific area.

## Reading Order

| # | File | What You'll Learn |
|---|------|-------------------|
| 1 | [01-architecture-overview.md](./01-architecture-overview.md) | The big picture — how every piece connects, what talks to what, and why the system is shaped this way |
| 2 | [02-why-fastapi-python.md](./02-why-fastapi-python.md) | Why Python + FastAPI over Node/Express, Go, or Django — and when you'd reconsider |
| 3 | [03-cloud-run-deep-dive.md](./03-cloud-run-deep-dive.md) | How Cloud Run works under the hood — containers, cold starts, scaling to zero, and why not Cloud Functions or a VM |
| 4 | [04-firestore-data-model.md](./04-firestore-data-model.md) | Why Firestore over Postgres/MongoDB, document design decisions, and the read/write cost math |
| 5 | [05-authentication-security.md](./05-authentication-security.md) | Firebase Auth, JWT verification, why not sessions, and how the middleware protects every route |
| 6 | [06-ai-coach-gemini.md](./06-ai-coach-gemini.md) | The AI pipeline — pre-screening, prompt engineering, cost control, and why most reflections never hit Gemini |
| 7 | [07-spaced-repetition-deadline.md](./07-spaced-repetition-deadline.md) | The 3-7-15 algorithm, the deadline engine math, and why it's pure functions with no side effects |
| 8 | [08-pwa-frontend.md](./08-pwa-frontend.md) | How the current PWA works — service workers, caching strategies, offline-first, and localStorage limits |
| 9 | [09-cost-scaling-strategy.md](./09-cost-scaling-strategy.md) | The free tier math, what breaks first at scale, and the specific levers to pull when costs rise |

## How to Use This

**Before any interview**, re-read the relevant files. For each topic, there's a "Questions You Should Be Able to Answer" section at the bottom — use those to self-test.

**When the codebase changes**, update the relevant file. These are living documents, not snapshots.
