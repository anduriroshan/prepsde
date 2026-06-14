# 02 — Why FastAPI + Python?

## The Decision

The backend is built with **FastAPI** running on **Python 3.11**. This is not the default choice for most web backends — Node.js/Express or Go would be more common. Here's why Python won.

---

## Why Python?

### 1. Best SDK Support for the Two Core Dependencies

The two most important external systems this backend talks to are:

| System | Python SDK | Node.js SDK | Winner |
|--------|-----------|-------------|--------|
| **Firebase Admin** (token verification, Firestore server-side) | `firebase-admin` — mature, well-documented, async support | `firebase-admin` — also mature, but slightly less ergonomic for complex queries | Tie |
| **Gemini API** | `google-generativeai` — first-party, always gets features first, structured output support | `@google/generative-ai` — also first-party but historically lags Python by weeks | **Python** |

Google's AI team writes Python first. When Gemini adds a new feature (like `responseMimeType: "application/json"` for structured output), the Python SDK gets it first. Since the AI coach is the most complex endpoint, this matters.

### 2. The Deadline Engine is Pure Math

Look at `services/deadline_engine.py`. It's date arithmetic with Python's `datetime` module:

```python
new_target = inp.current_target + timedelta(days=days_delta)
elapsed_days = (inp.today - inp.start_date).days
```

Python's `datetime` is batteries-included. In Node.js, you'd reach for `date-fns` or `dayjs` — adding a dependency for something Python does natively.

### 3. Pydantic for Type Safety

FastAPI uses **Pydantic** for request/response validation. Every API endpoint has typed models:

```python
class ReflectionCreate(BaseModel):
    accomplished: str
    struggled: str
    tomorrowPlan: str
    rating: int = Field(ge=1, le=5)
```

This gives you:
- Automatic request validation (rating must be 1-5, strings must be present)
- Auto-generated OpenAPI/Swagger docs at `/docs`
- Type hints that your IDE can check

**Compared to Express.js:** You'd need `zod` or `joi` for validation + `swagger-jsdoc` for docs. FastAPI bundles this out of the box.

---

## Why FastAPI Specifically?

### FastAPI vs Django vs Flask

| Criterion | FastAPI | Django | Flask |
|-----------|---------|--------|-------|
| **Async support** | Native `async/await` | Added in 3.1, but ORM is still sync | No native async (needs `quart`) |
| **Performance** | Built on Starlette + Uvicorn (ASGI), very fast | WSGI by default, slower | WSGI, slower |
| **Dependency injection** | `Depends()` pattern — elegant, composable | Middleware + decorators | Manual |
| **Auto-generated docs** | Yes, at `/docs` (Swagger) and `/redoc` | Django REST Framework adds it | Flask-RESTx adds it |
| **Learning curve** | Low — feels like writing typed functions | High — ORM, admin, templates, migrations | Low, but less structure |
| **Right-sized for this project?** | ✅ Yes — API-only, no admin panel, no ORM needed | ❌ Overkill — brings an ORM we don't need (we use Firestore) | ⚠️ Would work but no async, no auto-docs |

**Django is overkill** because it brings a full ORM, migration system, admin panel, and template engine. We don't use any of those — Firestore is our database and we have no server-rendered HTML.

**Flask would work** but lacks native async. The dashboard endpoint makes 6 parallel Firestore reads — with Flask you'd need threading or `asyncio` hacks. With FastAPI, it's just:

```python
results = await asyncio.gather(
    get_user(uid),
    get_streak(uid),
    get_due_reviews(uid),
    get_weekly_problems(uid),
    get_weekly_reflections(uid),
    get_latest_snapshot(uid),
)
```

---

## Why NOT Node.js / Express?

This is the most common counter-argument. Here's the honest comparison:

### Arguments FOR Node.js
- **Shared language** with the frontend (both are JavaScript/TypeScript)
- **Faster cold starts** on Cloud Run (~1.5s vs ~2.5s for Python)
- **Larger ecosystem** for web tooling (middleware, auth libraries)

### Arguments FOR Python (why we chose it)
- **Gemini SDK is Python-first** — new features land weeks earlier
- **Firebase Admin SDK** works equally well in both, so this is a tie
- **`datetime` module** is built-in — no external dependency for date math
- **Pydantic** gives us validation + OpenAPI docs + type safety in one package
- **The team (you)** is preparing for SDE2 roles where Python is expected for system design and ML

### The Cold Start Trade-off

Python cold starts on Cloud Run are ~2.5s vs ~1.5s for Node.js. This sounds bad, but:

1. Cold starts only happen when the service scales from 0 → 1 instances
2. Once warm, response times are equivalent (~50-100ms for simple endpoints)
3. This is a personal dev tool used at predictable times (morning and evening) — the first request of the day takes 2.5s, every subsequent request is fast
4. If cold starts become a problem, set `--min-instances=1` (costs ~$5/month)

**Verdict:** The cold start penalty is real but acceptable for this use case.

---

## Why NOT Go?

Go would give you:
- Fastest cold starts (~0.5s)
- Tiny Docker images (~15MB vs ~200MB for Python)
- Excellent concurrency

But Go would cost you:
- No official Gemini SDK (you'd use REST directly)
- More verbose error handling
- No auto-generated API docs without significant tooling
- Slower development speed for a solo project

**Go is the right choice** when you're building a high-throughput service that serves millions of requests. For a personal tool with ~30 DAU, development speed matters more than runtime performance.

---

## The `Depends()` Pattern — Why It Matters

FastAPI's dependency injection is the most elegant part of the framework. Here's how auth works:

```python
async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> str:
    token = credentials.credentials
    decoded = firebase_auth.verify_id_token(token)
    return decoded["uid"]

# Any route that needs auth:
@router.get("/dashboard")
async def get_dashboard(uid: str = Depends(get_current_user)):
    # uid is guaranteed to be a verified Firebase user ID
    ...
```

**What this does:** Every route that adds `uid: str = Depends(get_current_user)` automatically extracts the Bearer token, verifies it with Firebase, and injects the `uid`. If verification fails, the user gets a 401 before your route code ever runs.

**Why this is better than Express middleware:** In Express, you'd attach `req.user` in middleware and hope every route remembers to check it. With `Depends()`, if a route doesn't declare the dependency, it simply doesn't have access to `uid`. It's compile-time safe (your IDE will warn you), not runtime-hope.

---

## Questions You Should Be Able to Answer

1. "Why Python over Node.js for this backend?" (Lead with Gemini SDK, Pydantic, and datetime)
2. "What's the cold start penalty and why is it acceptable?"
3. "Why FastAPI over Django?" (Firestore means no ORM needed; Django brings unnecessary weight)
4. "Why FastAPI over Flask?" (Native async for parallel Firestore reads on the dashboard endpoint)
5. "How does dependency injection work in FastAPI? Give an example." (The auth middleware pattern)
6. "When would you switch to Node.js or Go?" (Node: if frontend team needs shared language. Go: if serving millions of requests and cold starts are critical)
