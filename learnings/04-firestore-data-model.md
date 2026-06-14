# 04 — Firestore Data Model

## Why Firestore?

The short answer: **Firebase Auth + Firestore are tightly coupled, and the free tier covers the first 200-300 users comfortably.**

But the real question is: why not PostgreSQL?

---

## Firestore vs PostgreSQL — The Honest Comparison

| Criterion | Firestore | PostgreSQL (Cloud SQL) |
|-----------|-----------|----------------------|
| **Cost at 0-100 users** | $0 (free tier: 50K reads/day, 20K writes/day, 1GB storage) | ~$7-15/month (smallest Cloud SQL instance, always running) |
| **Auth integration** | Firebase Auth + Firestore security rules work natively — one SDK, one project | Separate auth system needed. Firebase Auth can still work, but you manage the database connection separately |
| **Schema** | Schema-less (NoSQL documents) | Strict schema with migrations |
| **Querying** | Limited — no JOINs, no aggregations across collections, single-field inequality filters | Full SQL — JOINs, GROUP BY, window functions, CTEs |
| **Scaling** | Automatic — Google handles sharding, replication | Manual — you choose instance size, configure read replicas |
| **Real-time listeners** | Built-in — `onSnapshot()` pushes changes to clients instantly | Requires additional infrastructure (WebSockets, Redis pub/sub) |
| **Ops burden** | Zero — no connection pools, no vacuum, no index tuning | Significant — connection limits, query optimization, backups, failover |

### Why Firestore Wins for THIS Project

1. **Cost:** PostgreSQL on Cloud SQL costs money from day one. Firestore is free until you outgrow the free tier (~200-300 DAU).
2. **Firebase Auth integration:** The user signs in with Firebase Auth and gets a `uid`. Firestore security rules can enforce "users can only read their own documents" using `request.auth.uid == resource.data.userId`. No middleware needed.
3. **No migrations:** When you add a new field (like `leetcodeUsername`), you just start writing it. Old documents don't have it, and that's fine — your code handles the `None` case.

### When You'd Switch to PostgreSQL

- When you need **complex queries** (e.g., "show me all users whose streak dropped below 5 in the last week, grouped by phase")
- When you need **transactions across multiple collections** (Firestore transactions work but are limited to 500 writes per transaction)
- When you need **relational data** with many-to-many relationships
- When you hit **Firestore's billing cliff** (~$0.06 per 100K reads, which adds up fast at 5,000+ DAU)

---

## The Document Structure

Firestore organizes data as **documents inside collections**. There are no tables, no rows, no JOINs.

### Collection: `users`

```
users/{uid}
├── name: "Roshan"
├── email: "roshanandhuri@gmail.com"
├── targetRole: "SDE2"
├── startDate: "2026-06-16"
├── targetDate: "2026-12-15"
├── currentPhase: 1
├── totalProblemsLogged: 42
├── geminiLastCalledAt: "2026-06-14T18:00:00Z"
├── leetcodeUsername: "roshananduri"    (nullable)
├── createdAt: timestamp
└── updatedAt: timestamp
```

**Document ID = Firebase Auth `uid`**. This means you can read a user's document with just their auth token — no lookup query needed.

### Collection: `problems`

```
problems/{nanoid}
├── userId: "abc123"
├── name: "Two Sum"
├── link: "https://leetcode.com/problems/two-sum/"
├── difficulty: "easy"
├── pattern: "arrays"
├── solvedIndependently: "yes"
├── notes: "Used hashmap for O(n) solution..."
├── dateSolved: "2026-06-14"
├── nextReviewDate: "2026-06-17"       (3 days after solve)
├── reviewStage: 1                     (1=Day3, 2=Day7, 3=Day15, 4=mastered)
├── mastered: false
├── reviews: {
│     day3: "2026-06-17",
│     day7: null,
│     day15: null
│   }
├── createdAt: timestamp
└── updatedAt: timestamp
```

**Why `userId` as a field, not a sub-collection under `users/{uid}/problems`?**

Both approaches work, but top-level collections with a `userId` field are easier to query across all users (needed for the nightly deadline batch job). Sub-collections under `users/{uid}` are better for strict data isolation but make cross-user queries impossible without collection group queries (which have their own limitations).

### Collection: `reflections`

```
reflections/{userId}_{date}
├── userId: "abc123"
├── date: "2026-06-14"
├── dayNumber: 1
├── accomplished: "Solved 3 NeetCode array problems..."
├── struggled: "Sliding window is still confusing..."
├── tomorrowPlan: "Finish binary search section"
├── rating: 4
├── verdict: "deep_work"               (set by AI coach)
├── createdAt: timestamp
└── updatedAt: timestamp
```

**Document ID = `{userId}_{date}`**. This enforces one reflection per user per day at the database level. If the user submits again, it's an upsert — the existing document is overwritten.

### Collection: `streaks`

```
streaks/{uid}
├── currentStreak: 12
├── longestStreak: 14
├── lastActiveDate: "2026-06-14"
└── updatedAt: timestamp
```

**Why a separate collection instead of fields on `users`?** Streaks are updated on every activity (task completion, reflection, problem solve). Keeping them in a small, separate document avoids re-reading the entire (potentially large) user document just to update the streak count.

---

## Key Design Decisions

### 1. Denormalization Over JOINs

In PostgreSQL, you'd normalize: `problems` table, `reviews` table, join them. In Firestore, the review data is embedded inside the problem document:

```json
{
  "reviews": {
    "day3": "2026-06-17",
    "day7": null,
    "day15": null
  }
}
```

**Why?** Firestore charges per document read. If reviews were a separate collection, loading a problem + its reviews = 2 reads. With embedding, it's 1 read. At 50K free reads/day, every read counts.

**Trade-off:** If you ever need "show me all reviews across all users that happened today," this structure makes it harder. You'd need to query all problems where `reviews.day3 == today` — which requires a composite index.

### 2. Composite Indexes

Firestore requires you to create composite indexes for queries that filter on multiple fields. For example:

```
Query: problems where userId == X AND nextReviewDate <= today AND mastered == false
```

This needs a composite index on `(userId, nextReviewDate, mastered)`. These are defined in `firestore.indexes.json`.

**This is the biggest Firestore gotcha.** If you forget to create an index, the query fails at runtime with an error message that includes a link to create it. Always check `firestore.indexes.json` when adding new queries.

### 3. Security Rules — Defense in Depth

```javascript
match /{document=**} {
    allow read: if request.auth != null && request.auth.uid == resource.data.userId;
    allow write: if false;  // All writes go through the backend
}
```

**All writes are blocked at the Firestore rules level.** The backend uses a service account that bypasses these rules entirely. This means:

- Even if someone extracts the Firebase config from the client app, they can't write to Firestore directly
- Reads are allowed only for the user's own documents (defense in depth — the backend also enforces this)
- The backend is the single source of truth for all data modifications

---

## The Free Tier Math

| Resource | Free Tier Per Day | Our Usage at 30 DAU | Headroom |
|----------|------------------|---------------------|----------|
| Document reads | 50,000 | ~750 (25 reads × 30 users) | 98.5% free |
| Document writes | 20,000 | ~150 (5 writes × 30 users) | 99.3% free |
| Storage | 1 GB total | ~10 MB (estimated) | 99% free |

**When does this break?** At roughly 200-300 DAU, you start approaching the daily read limit. At that point, caching the dashboard response with a 5-minute TTL cuts reads by ~50%.

---

## Questions You Should Be Able to Answer

1. "Why Firestore over PostgreSQL?" (Cost at low scale, Firebase Auth integration, zero ops)
2. "When would you migrate to PostgreSQL?" (Complex queries, many-to-many relations, >2K DAU)
3. "Why embed review data inside the problem document?" (1 read vs 2 reads; Firestore charges per read)
4. "How do you enforce one reflection per user per day?" (Document ID = `{userId}_{date}` — idempotent upsert)
5. "Why is `streaks` a separate collection from `users`?" (Frequently updated, small document, avoids re-reading large user docs)
6. "How do Firestore security rules work alongside backend auth?" (Rules block direct client writes; backend uses service account that bypasses rules)
7. "What's a composite index and when do you need one?" (Multi-field queries require pre-defined indexes in `firestore.indexes.json`)
