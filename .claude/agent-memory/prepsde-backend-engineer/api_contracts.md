---
name: api-contracts
description: API endpoint shapes, auth patterns, and client expectations derived from index.tsx, useDSATracker.ts, and useDeadline.ts
metadata:
  type: project
---

**Auth pattern:** Every protected route uses `uid: str = Depends(get_current_user)`. The uid is NEVER taken from request body. Firebase ID token in `Authorization: Bearer <token>` header.

**Scheduler routes** use `X-Scheduler-Token` header with a shared secret (not Firebase token).

**Key client-expected data shapes (from index.tsx):**

Dashboard bento cards need:
- streakCount (number), dueReviewsCount (number), totalProblemsSolved (number), avgAccuracy (number 0-100)
- daysLeft (int) — computed from targetDate
- paceStatus ("ahead" | "on_track" | "behind")
- dueReviews list: [{id, name, pattern, tag}] where tag = "Day 7 review" | "Day 15 review" etc.
- todayTasks list: [{id, label, done, estimate}]
- weeklyPace: {problemsActual, problemsTarget, systemDesignActual, systemDesignTarget, reflectionsActual, reflectionsTarget}

**Reflection/AI flow (two separate calls — decoupled):**
1. POST /reflections → saves reflection, returns reflectionId
2. POST /ai/coach → evaluates, updates reflection doc with verdict, returns CoachResponse

CoachResponse shape:
```json
{
  "verdict": "deep_work" | "surface" | "lazy",
  "feedback": "string",
  "lessonTitle": "string",
  "lessonContent": "string"
}
```

**Problem shape (from useDSATracker.ts):**
```typescript
{
  id: string,
  name: string,
  difficulty: "easy" | "medium" | "hard",
  pattern: "arrays"|"two-pointers"|"sliding-window"|"stack"|"binary-search"|
           "linked-list"|"trees"|"graphs"|"heap"|"dp"|"backtracking"|
           "tries"|"greedy"|"intervals"|"bit-manipulation",
  solvedIndependently: "yes" | "no" | "partially",
  notes?: string,
  url?: string,
  nextReviewDate: string,   // ISO date YYYY-MM-DD
  reviewCount: number,
  mastered: boolean
}
```

**useDeadline.ts hook** only takes a targetDate string and computes daysLeft client-side. The backend stores and updates targetDate; client just reads it.

**Important conflict resolved:** Old PWA used "productive"/"mediocre"/"lazy" as verdict values. New backend uses "deep_work"/"surface"/"lazy" — matches the features.md color-coding (green/yellow/red). Do not use the old values.
