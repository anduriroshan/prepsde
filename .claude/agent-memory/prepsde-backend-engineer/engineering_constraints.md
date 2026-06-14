---
name: engineering-constraints
description: Non-negotiable engineering rules for PrepSDE backend — violating any is a critical bug
metadata:
  type: project
---

1. **Gemini quota: 1 call per user per day.** Check `geminiLastCalledAt` in users/{uid} BEFORE calling Gemini. Store ISO datetime after successful call. Reset logic is timezone-sensitive — open question: UTC vs IST. Currently defaulting to UTC.

2. **Pre-screen always runs BEFORE Gemini.** Order: combined text < 30 chars → hardcoded lazy response. No DSA/sysdesign keywords → hardcoded surface response. Only if both pass AND quota available → call Gemini. Pre-screen needs NO Firestore reads.

3. **uid always from verified Firebase token.** Never from request body, headers, or query params. `uid: str = Depends(get_current_user)` on every protected route.

4. **Deadline engine is pure math.** `calculate_deadline_adjustment()` takes primitives, returns primitives, has zero imports of Firestore/HTTP/datetime.now(). Today's date is a parameter. Fully unit-testable.

5. **Cloud Run stateless.** No module-level mutable state. No background threads. Firestore client initialized in lifespan event, passed via dependency injection.

6. **All secrets from env vars.** GEMINI_API_KEY, SCHEDULER_SECRET, Firebase service account — never hardcoded. In production, Secret Manager mounts them as env vars.

7. **Deadline engine caps:** max +3 days/week extension, max -2 days/week shrink. Rule: 2+ consecutive lazy/missed days → +1 day per pair. Every 3 extra problems beyond weekly target → -1 day.

8. **Reflection uniqueness:** One per user per day. Doc ID = `{userId}_{date}`. POST /reflections must check existence before creating.

9. **Verdict enum values:** "deep_work" | "surface" | "lazy" (not the old PWA values productive/mediocre/lazy).

10. **AI/coach endpoint is decoupled from reflection save.** POST /reflections saves data. POST /ai/coach evaluates and updates. This way a Gemini failure never blocks reflection persistence.
