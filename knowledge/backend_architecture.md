# PrepSDE Backend Architecture

> Engineering specification for the FastAPI + Firestore + Firebase Auth + Gemini backend.
> Target deployment: Google Cloud Run. Budget: ~$1,050 USD in GCP credits.
> Written for engineers to implement from directly.

---

## 1. Executive Summary

The PrepSDE backend is a stateless FastAPI service running on Cloud Run that acts as the secure proxy between the mobile client and three external systems: Firebase Auth (identity), Firestore (persistence), and Gemini (AI evaluation). Every request that touches user data carries a Firebase ID token which the backend verifies server-side — the client never holds a Gemini API key or any service credential. The AI coach endpoint is the most expensive component in both latency and cost; it is guarded by a two-stage pre-screen that eliminates Gemini calls for low-quality reflections (the common case) and a per-user daily quota tracked in Firestore. The deadline engine is intentionally AI-free: it is pure date arithmetic on reflection verdicts, capped at ±3 days per week, making it deterministic, fast, and independently testable. Cloud Scheduler drives nightly deadline recalculation and weekly summary generation, both invoked as authenticated HTTP POST requests to the same Cloud Run service. Firestore's free tier (50K reads / 20K writes / 20K deletes per day, 1 GB storage) comfortably supports the first 200-300 active users with careful schema design; cost scales only when that threshold is exceeded.

---

## 2. High Level Design

### 2.1 System Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│  CLIENT (React Native / Expo)                                        │
│  Firebase SDK: Auth tokens, Firestore real-time listeners            │
└─────────────────┬─────────────────────────────┬──────────────────────┘
                  │ HTTPS + Firebase ID Token   │ Firestore SDK (direct)
                  ▼                             ▼
┌──────────────────────────┐      ┌──────────────────────────────────┐
│  Cloud Run               │      │  Firestore (Firebase free tier)  │
│  FastAPI (Python 3.11)   │◄────►│  Collections:                    │
│                          │      │    users, problems, reflections,  │
│  Routers:                │      │    streaks, deadlineAdjustments,  │
│  /problems               │      │    weeklySnapshots               │
│  /reflections            │      └──────────────────────────────────┘
│  /streaks                │
│  /dashboard              │      ┌──────────────────────────────────┐
│  /deadline               │      │  Firebase Authentication         │
│  /ai/coach               │◄────►│  (Google one-tap)                │
│  /progress               │      │  ID token verification via       │
│  /health                 │      │  firebase-admin SDK              │
│                          │      └──────────────────────────────────┘
│  Middleware:             │
│  Firebase token verify   │      ┌──────────────────────────────────┐
│  Request logging         │◄────►│  Vertex AI / Gemini              │
│                          │      │  gemini-2.0-flash-lite           │
└──────────────────────────┘      │  (server-side only, key in       │
           ▲                      │  Secret Manager)                 │
           │                      └──────────────────────────────────┘
           │ Authenticated HTTP POST
┌──────────────────────────┐
│  Cloud Scheduler         │
│  - Nightly (23:00 IST)   │
│    POST /deadline/nightly │
│  - Weekly (Sun 08:00 IST) │
│    POST /progress/weekly  │
└──────────────────────────┘
```

### 2.2 Auth Flow

```
1. Client calls Firebase Auth (Google one-tap)
2. Firebase returns an ID token (JWT, ~1 hour TTL)
3. Client sends every API request with:
   Authorization: Bearer <firebase_id_token>
4. FastAPI dependency get_current_user():
   a. Extracts token from Authorization header
   b. Calls firebase_admin.auth.verify_id_token(token)
   c. Returns decoded token; uid extracted from decoded["uid"]
   d. Attaches uid to request.state.uid
   e. On failure: HTTP 401 with reason (expired, invalid, revoked)
5. Route handler uses request.state.uid for all Firestore operations
   (never trusts a uid sent in the request body)
```

### 2.3 Real-Time Data Strategy

The client uses Firestore SDK real-time listeners directly for:
- Streak count (updates immediately after reflection submit)
- Due reviews count (updates after problem review)
- Deadline changes (updates after nightly scheduler run)

The backend does NOT implement WebSockets or SSE. Firestore listeners are sufficient for this use case because:
- Updates are not high-frequency (at most 1-2 writes/day per user)
- Firestore free tier covers listener usage
- No additional infrastructure needed

The `/dashboard` endpoint is still needed for the initial page load (aggregation that would require multiple Firestore reads from the client).

### 2.4 Cloud Scheduler Integration

Cloud Scheduler calls the backend with a shared secret in the `X-Scheduler-Token` header. The backend verifies this token (stored in Secret Manager, loaded as env var `SCHEDULER_SECRET`) before executing the job. This is simpler and cheaper than full service account auth for scheduler-to-Cloud-Run calls within the same project.

```
Cloud Scheduler → POST /deadline/nightly
  Header: X-Scheduler-Token: <secret>
  Body: {} (empty — backend queries Firestore internally)

Cloud Scheduler → POST /progress/weekly
  Header: X-Scheduler-Token: <secret>
  Body: {}
```

---

## 3. Database Design — Firestore Schema

### 3.1 Design Decisions: Subcollections vs Top-Level

**Decision: Top-level collections for all entities.**

Rationale:
- Firestore charges per document read. If problems were a subcollection of users, fetching a user document would NOT automatically fetch problems — you'd still need a separate query. Subcollections offer no read-cost advantage.
- Top-level collections allow collection group queries (e.g., "all problems due today across all users" — needed for future analytics/debugging).
- Simpler security rules: each collection scoped to `request.auth.uid == resource.data.userId`.
- The only case where subcollections win is when you want strong parent-child co-location for atomic operations. We don't have that here.

### 3.2 Collection Schemas

#### `users/{uid}`
```
{
  uid:              string,          // Firebase UID, also the document ID
  email:            string,
  name:             string,
  targetRole:       "SDE1" | "SDE2" | "Senior" | "Staff",
  startDate:        string,          // ISO date "YYYY-MM-DD"
  targetDate:       string,          // ISO date "YYYY-MM-DD" — current adjusted deadline
  originalDeadline: string,          // ISO date — never changes after onboarding
  currentPhase:     1 | 2 | 3,
  phaseStartDate:   string,          // When current phase began
  focusAreas:       string[],        // ["DSA", "SystemDesign", "LLD", "Behavioral"]
  streakCount:      number,          // Current consecutive-day streak
  longestStreak:    number,
  lastActiveDate:   string,          // ISO date — for streak calculation
  totalProblemsLogged: number,       // Denormalized counter
  geminiLastCalledAt:  string | null, // ISO datetime — Gemini daily quota gate
  createdAt:        Timestamp,
  updatedAt:        Timestamp
}
```

#### `problems/{problemId}`
```
{
  id:                   string,      // Document ID (nanoid or UUID)
  userId:               string,      // Firebase UID
  name:                 string,
  url:                  string | null,
  difficulty:           "easy" | "medium" | "hard",
  pattern:              string,      // See Pattern type in useDSATracker.ts
  solvedIndependently:  "yes" | "no" | "partially",
  notes:                string | null,
  reviewCount:          number,      // 0, 1, 2 — drives interval schedule
  nextReviewDate:       string,      // ISO date "YYYY-MM-DD"
  mastered:             boolean,
  reviewHistory:        {
    date:     string,               // ISO date
    struggled: boolean
  }[],
  createdAt:            Timestamp,
  updatedAt:            Timestamp
}
```

**Spaced repetition intervals (from useDSATracker.ts — source of truth):**
- reviewCount=0 (just logged): nextReviewDate = today + 3 days
- Review 1 complete (not struggled): nextReviewDate = today + 7 days, reviewCount → 1
- Review 2 complete (not struggled): nextReviewDate = today + 15 days, reviewCount → 2
- Review 3 complete (not struggled): mastered = true, reviewCount → 3
- Any review where struggled=true: reviewCount → 0, nextReviewDate = today + 3 days

#### `reflections/{reflectionId}`
```
{
  id:           string,             // Document ID
  userId:       string,             // Firebase UID
  date:         string,             // ISO date "YYYY-MM-DD" — one per user per day
  rating:       1 | 2 | 3 | 4 | 5,
  accomplished: string,
  struggled:    string,
  tomorrowPlan: string,
  aiVerdict:    "deep_work" | "surface" | "lazy" | null,
  aiMessage:    string | null,
  microLesson: {
    title:   string,
    content: string,
    question: string
  } | null,
  prescreenResult: "passed" | "too_short" | "no_keywords" | "quota_exceeded",
  submittedAt:  Timestamp,
  updatedAt:    Timestamp
}
```

**Note on uniqueness:** Enforce one reflection per user per date in the backend — query by (userId, date) before creating. The document ID can be `{userId}_{date}` (e.g., `abc123_2026-06-14`) for O(1) existence checks.

#### `streaks/{uid}`
```
{
  uid:            string,           // Same as user UID, document ID
  current:        number,
  longest:        number,
  lastActiveDate: string,           // ISO date
  history: {
    [isoDate: string]: boolean      // Map of date → active (true = logged reflection)
  }
}
```

**Note:** The `history` map is kept to last 90 days in the backend update function (prune entries older than 90 days on each write). The heatmap only needs 12 weeks = 84 days.

#### `deadlineAdjustments/{adjustmentId}`
```
{
  id:               string,
  userId:           string,
  triggeredAt:      Timestamp,
  triggerReason:    string,         // Human-readable: "2 consecutive lazy days"
  daysDelta:        number,         // Positive = extended, negative = shrunk
  previousDeadline: string,         // ISO date before adjustment
  newDeadline:      string,         // ISO date after adjustment
  lazyDaysCount:    number,
  extraProblemsCount: number,
  weeklyProblemsActual: number,
  weeklyProblemsTarget: number
}
```

#### `weeklySnapshots/{snapshotId}`
```
{
  id:                  string,      // "{uid}_{weekStartDate}"
  userId:              string,
  weekStartDate:       string,      // ISO date (Monday)
  weekEndDate:         string,      // ISO date (Sunday)
  problemsSolved:      number,
  systemDesignTopics:  number,
  reflectionsLogged:   number,
  avgRating:           number,
  verdictCounts: {
    deep_work: number,
    surface:   number,
    lazy:      number
  },
  deadlineChangeDays:  number,      // Net delta that week (0 if none)
  paceStatus:         "ahead" | "on_track" | "behind",
  generatedAt:         Timestamp
}
```

### 3.3 Composite Indexes Required

Create these in `firestore.indexes.json`:

| Collection | Fields | Query that needs it |
|---|---|---|
| `problems` | `userId ASC`, `nextReviewDate ASC` | Due reviews for a user |
| `problems` | `userId ASC`, `pattern ASC`, `mastered ASC` | Topic mastery breakdown |
| `problems` | `userId ASC`, `mastered ASC`, `createdAt DESC` | All problems, filter mastered |
| `reflections` | `userId ASC`, `date DESC` | Past reflections list |
| `reflections` | `userId ASC`, `submittedAt DESC` | Last N reflections for deadline engine |
| `deadlineAdjustments` | `userId ASC`, `triggeredAt DESC` | Adjustment history |
| `weeklySnapshots` | `userId ASC`, `weekStartDate DESC` | Progress page weekly cards |

### 3.4 Free Tier Cost Analysis

**Firestore free tier limits (per day):**
- 50,000 document reads
- 20,000 document writes
- 20,000 document deletes
- 1 GB storage

**Estimated operations per active user per day:**

| Action | Reads | Writes |
|---|---|---|
| App launch (dashboard aggregation) | 6 | 0 |
| Submit reflection (with AI coach) | 3 | 2 |
| Log a problem | 1 | 1 |
| Mark problem reviewed | 1 | 1 |
| View past reflections (list) | 5 | 0 |
| View progress page | 8 | 0 |
| Streak update (triggered by reflection) | 1 | 1 |
| **Total per DAU** | **~25** | **~5** |

**Free tier headroom:**
- 50,000 reads / 25 reads per DAU = **2,000 daily active users** before read limit
- 20,000 writes / 5 writes per DAU = **4,000 daily active users** before write limit

**Nightly scheduler (flat cost regardless of user count):**
- Reads: ~10 per user with activity (last 7 reflections + user doc + streak doc)
- Writes: 1 deadlineAdjustments doc + 1 user doc update if deadline changed

**Conclusion:** Firestore free tier comfortably covers 200 MAU (assuming 30% DAU rate → 60 DAU), with room for 30x growth before any Firestore cost. Storage: each user document is roughly 2KB; at 1,000 users with 200 problems each = ~400MB. Well within 1GB.

---

## 4. Low Level Design

### 4a. FastAPI Project Structure

```
apps/backend/
├── main.py                         # App factory, CORS, router registration, lifespan
├── requirements.txt                # Pinned dependencies
├── Dockerfile                      # Cloud Run optimized
├── .env.example                    # All required env vars
├── firestore.indexes.json          # Composite index definitions
│
├── routers/
│   ├── __init__.py
│   ├── health.py                   # GET /health — no auth
│   ├── users.py                    # POST /users/onboard, GET /users/me, PUT /users/me
│   ├── problems.py                 # CRUD + review endpoints
│   ├── reflections.py              # POST /reflections, GET /reflections
│   ├── streaks.py                  # GET /streaks/me (read-only; written as side-effect)
│   ├── dashboard.py                # GET /dashboard — aggregated home screen data
│   ├── deadline.py                 # GET /deadline, POST /deadline/evaluate (scheduler)
│   ├── coach.py                    # POST /ai/coach
│   └── progress.py                 # GET /progress, POST /progress/weekly (scheduler)
│
├── middleware/
│   ├── __init__.py
│   └── auth.py                     # Firebase ID token verification dependency
│
├── repositories/
│   ├── __init__.py
│   ├── users.py                    # Firestore data access for users collection
│   ├── problems.py                 # Firestore data access for problems collection
│   ├── reflections.py              # Firestore data access for reflections collection
│   ├── streaks.py                  # Firestore data access for streaks collection
│   ├── deadline_adjustments.py     # Firestore data access for deadlineAdjustments
│   └── weekly_snapshots.py         # Firestore data access for weeklySnapshots
│
├── services/
│   ├── __init__.py
│   ├── ai_coach.py                 # Pre-screen logic + Gemini call + response parsing
│   ├── deadline_engine.py          # Pure math deadline adjustment algorithm
│   ├── spaced_repetition.py        # 3-7-15 interval calculation logic
│   ├── streak_service.py           # Streak update logic (timezone-aware)
│   └── weekly_summary.py           # Weekly snapshot generation logic
│
├── models/
│   ├── __init__.py
│   ├── user.py                     # UserCreate, UserUpdate, UserResponse Pydantic models
│   ├── problem.py                  # ProblemCreate, ProblemUpdate, ProblemResponse
│   ├── reflection.py               # ReflectionCreate, ReflectionResponse
│   ├── deadline.py                 # DeadlineState, DeadlineAdjustment, DeadlineEvaluateResponse
│   ├── coach.py                    # CoachRequest, CoachResponse, Verdict enum
│   └── dashboard.py                # DashboardResponse (all bento card data)
│
└── config.py                       # Settings loaded from env vars via pydantic-settings
```

**Single responsibility rule:**
- Routers validate input shape and return response shape. No business logic.
- Services contain all business logic. No Firestore calls.
- Repositories contain all Firestore calls. No business logic.
- Models define data shapes. No behavior.

### 4b. Auth Middleware

```python
# middleware/auth.py

from fastapi import Request, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import firebase_admin.auth as firebase_auth
import logging

logger = logging.getLogger(__name__)
security = HTTPBearer()

async def get_current_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> str:
    """
    FastAPI dependency. Verifies Firebase ID token.
    Returns uid (str). Raises HTTP 401 on any failure.
    Attach to any protected route with: uid: str = Depends(get_current_user)
    """
    token = credentials.credentials
    try:
        decoded = firebase_auth.verify_id_token(token, check_revoked=True)
        uid = decoded["uid"]
        request.state.uid = uid
        return uid
    except firebase_auth.RevokedIdTokenError:
        logger.warning("Revoked token presented for uid extraction attempt")
        raise HTTPException(status_code=401, detail="Token has been revoked")
    except firebase_auth.ExpiredIdTokenError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except firebase_auth.InvalidIdTokenError as e:
        logger.warning(f"Invalid token: {e}")
        raise HTTPException(status_code=401, detail="Invalid authentication token")
    except Exception as e:
        logger.error(f"Token verification error: {e}")
        raise HTTPException(status_code=401, detail="Authentication failed")

# Scheduler-only route protector (used by /deadline/nightly, /progress/weekly)
async def verify_scheduler_token(request: Request) -> None:
    """
    Verifies X-Scheduler-Token header for Cloud Scheduler calls.
    The secret value is stored in Secret Manager and loaded as SCHEDULER_SECRET env var.
    """
    from config import settings
    token = request.headers.get("X-Scheduler-Token")
    if not token or token != settings.SCHEDULER_SECRET:
        raise HTTPException(status_code=403, detail="Scheduler token invalid")
```

**Usage in a route:**
```python
@router.post("/reflections", status_code=201)
async def create_reflection(
    body: ReflectionCreate,
    uid: str = Depends(get_current_user)
):
    # uid is verified — never use body.userId
    ...
```

### 4c. AI Coach Endpoint — Rule-Based Pre-Screen

This is the most important endpoint. The pre-screen must run before any Gemini call — every time, no exceptions.

**Keyword lists (minimum, extend as needed):**

```python
# services/ai_coach.py

DSA_KEYWORDS = {
    "array", "arrays", "tree", "trees", "graph", "graphs",
    "dynamic programming", "dp", "recursion", "recursive",
    "backtracking", "binary search", "hash map", "hashmap",
    "hash table", "hashtable", "queue", "stack", "heap",
    "linked list", "sorting", "sort", "two pointer", "two pointers",
    "sliding window", "bfs", "dfs", "trie", "tries",
    "greedy", "intervals", "bit manipulation", "binary",
    "prefix sum", "monotonic", "union find", "disjoint set",
    "neetcode", "leetcode", "problem", "solved", "coded",
    "pattern", "approach", "algorithm", "complexity",
    "time complexity", "space complexity", "o(n)", "o(log",
}

SYSDESIGN_KEYWORDS = {
    "scalability", "scale", "load balancer", "load balancing",
    "cache", "caching", "redis", "database", "sharding",
    "replication", "replica", "microservice", "microservices",
    "api gateway", "message queue", "kafka", "cdn",
    "consistency", "availability", "partition", "cap theorem",
    "rate limit", "rate limiting", "distributed", "latency",
    "throughput", "horizontal scaling", "vertical scaling",
    "system design", "architecture", "service", "queue",
    "event driven", "pub sub", "nosql", "sql", "indexing",
    "read replica", "write ahead log", "wal",
}

ALL_TECHNICAL_KEYWORDS = DSA_KEYWORDS | SYSDESIGN_KEYWORDS
```

**Pre-screen pipeline:**

```python
class PreScreenResult(str, Enum):
    PASSED = "passed"
    TOO_SHORT = "too_short"
    NO_KEYWORDS = "no_keywords"
    QUOTA_EXCEEDED = "quota_exceeded"

def prescreen_reflection(text: str) -> tuple[PreScreenResult, str | None]:
    """
    Returns (result, reason).
    reason is None when result is PASSED.
    
    Rules (evaluated in order):
    1. Combined text < 30 chars → TOO_SHORT
    2. No technical keywords found → NO_KEYWORDS
    3. Both checks pass → PASSED (quota check happens outside this function)
    
    Note: word count is deliberately NOT used as the threshold.
    Character count is more robust against single-word gaming ("twopointers" is 1 word, 11 chars).
    """
    combined = f"{text}".lower().strip()
    
    if len(combined) < 30:
        return PreScreenResult.TOO_SHORT, "Reflection is too short to evaluate."
    
    # Check for any technical keyword (substring match — handles concatenated terms)
    has_technical = any(kw in combined for kw in ALL_TECHNICAL_KEYWORDS)
    if not has_technical:
        return PreScreenResult.NO_KEYWORDS, "No DSA or system design content detected."
    
    return PreScreenResult.PASSED, None


async def check_gemini_quota(uid: str, db) -> bool:
    """Returns True if user CAN call Gemini (has not used quota today)."""
    user_doc = await db.collection("users").document(uid).get()
    if not user_doc.exists:
        return True  # New user, definitely hasn't called Gemini today
    
    user_data = user_doc.to_dict()
    last_called = user_data.get("geminiLastCalledAt")
    if not last_called:
        return True
    
    # Compare dates in UTC
    from datetime import datetime, timezone
    last_called_dt = datetime.fromisoformat(last_called).replace(tzinfo=timezone.utc)
    today_utc = datetime.now(timezone.utc).date()
    return last_called_dt.date() < today_utc


async def record_gemini_call(uid: str, db) -> None:
    """Updates geminiLastCalledAt timestamp after a successful Gemini call."""
    from datetime import datetime, timezone
    await db.collection("users").document(uid).update({
        "geminiLastCalledAt": datetime.now(timezone.utc).isoformat()
    })
```

**Full coach endpoint flow:**

```python
@router.post("/ai/coach", response_model=CoachResponse)
async def coach_reflect(
    body: CoachRequest,
    uid: str = Depends(get_current_user),
    db = Depends(get_db)
):
    # Step 1: Combine all reflection fields into one text blob for pre-screening
    combined_text = f"{body.accomplished} {body.struggled} {body.tomorrowPlan}"
    
    # Step 2: Rule-based pre-screen (ALWAYS runs — no Gemini, no Firestore read needed)
    prescreen_result, prescreen_reason = prescreen_reflection(combined_text)
    
    if prescreen_result == PreScreenResult.TOO_SHORT:
        return hardcoded_lazy_response(body)
    
    if prescreen_result == PreScreenResult.NO_KEYWORDS:
        return hardcoded_surface_response(body)
    
    # Step 3: Quota check (Firestore read — only reached if pre-screen passes)
    can_call_gemini = await check_gemini_quota(uid, db)
    
    if not can_call_gemini:
        logger.warning(f"Gemini quota exceeded for uid={uid}")
        return hardcoded_quota_exceeded_response(body)
    
    # Step 4: Call Gemini
    try:
        gemini_response = await call_gemini(body, uid)
        await record_gemini_call(uid, db)   # Step 5: Record the call
        return gemini_response
    except GeminiError as e:
        logger.error(f"Gemini call failed for uid={uid}: {e}")
        # Graceful degradation — return a surface-level response, don't fail the user
        return hardcoded_surface_response(body)
```

**Hardcoded template responses (NOT placeholders — must be useful):**

```python
def hardcoded_lazy_response(body: CoachRequest) -> CoachResponse:
    return CoachResponse(
        verdict="lazy",
        feedback=(
            "This reflection doesn't give me enough to work with. "
            "A good reflection takes 2 minutes: what specific problem did you solve, "
            "what was your approach, and where did you get stuck? Try again."
        ),
        lessonTitle="The Reflection Habit That Separates Senior Engineers",
        lessonContent=(
            "Top engineers at Google and Amazon don't just code — they debrief. "
            "After every problem, they ask: what pattern did this reinforce? "
            "What would break my solution at scale? What would I do differently?\n\n"
            "This is called deliberate practice. Without it, you're just accumulating "
            "hours, not skills. A 30-second reflection locks the learning.\n\n"
            "Tomorrow: after your first problem, write one sentence about the core insight. "
            "Not what you did — what you now understand that you didn't before."
        ),
    )


def hardcoded_surface_response(body: CoachRequest) -> CoachResponse:
    return CoachResponse(
        verdict="surface",
        feedback=(
            "You showed up — that counts. But I need more specifics: "
            "which problems, which patterns, what clicked? "
            "Surface-level entries give surface-level feedback."
        ),
        lessonTitle="How to Think About System Design Problems",
        lessonContent=(
            "Most candidates fail system design not because they don't know the concepts, "
            "but because they don't have a framework. Start every design with: "
            "clarify requirements, estimate scale, then pick your data model.\n\n"
            "A URL shortener at 100 writes/day is solved with SQLite. "
            "At 10M writes/day you need sharding, read replicas, and a cache layer. "
            "The interviewer wants to see that you think about scale before picking tools.\n\n"
            "Practice: take any problem you've solved this week and ask — "
            "how would this break at 1000x the load? What's your first bottleneck?"
        ),
    )


def hardcoded_quota_exceeded_response(body: CoachRequest) -> CoachResponse:
    return CoachResponse(
        verdict="surface",
        feedback=(
            "You've already received AI feedback today. "
            "Keep going — your next evaluation resets at midnight UTC."
        ),
        lessonTitle="Compound Learning: Why Consistency Beats Intensity",
        lessonContent=(
            "One great session per week beats seven mediocre ones only if "
            "you have perfect recall — which no one does. "
            "The research on spaced repetition shows that daily exposure, "
            "even for 45 minutes, outperforms 5-hour weekend marathons.\n\n"
            "This is why PrepSDE's 3-7-15 review schedule matters: "
            "it forces you to revisit problems at exactly the point when your brain "
            "is about to forget them, maximizing retention efficiency.\n\n"
            "Your job today: finish the problems on your review queue. "
            "Consistency is the strategy."
        ),
    )
```

**Gemini prompt design:**

```python
GEMINI_SYSTEM_PROMPT = """You are the PrepSDE AI Coach. You evaluate daily prep reflections from software engineers preparing for senior-level SDE interviews at top tech companies.

Your job is to assess effort and quality, then provide useful feedback. Be direct, specific, and calibrated — not motivational-poster generic.

Output ONLY valid JSON matching this exact schema:
{
  "verdict": "deep_work" | "surface" | "lazy",
  "feedback": string (2-4 sentences, specific to what they wrote),
  "lessonTitle": string (a real engineering concept, not generic),
  "lessonContent": string (3 paragraphs, factual engineering content relevant to their current focus)
}

Verdict definitions:
- deep_work: Specific problems mentioned, patterns identified, real struggles described, tomorrow's plan is concrete
- surface: Some activity mentioned but vague ("did some arrays", "read system design"), no specifics
- lazy: Minimal content, filler words, or clearly not a genuine reflection

Do not output anything except the JSON object. No markdown, no preamble."""


GEMINI_USER_TEMPLATE = """Evaluate this prep reflection:

Accomplished: {accomplished}
Struggled with: {struggled}  
Tomorrow's plan: {tomorrow_plan}
Day rating: {rating}/5

The user is preparing for {target_role} at a top tech company. Current phase: {current_phase}/3."""
```

**Gemini API choice — Google AI Studio (REST) vs Vertex AI:**

Use **Google AI Studio (generativelanguage.googleapis.com)** for MVP. Reasons:
- No IAM role setup required — just an API key stored in Secret Manager
- Vertex AI requires a service account with `roles/aiplatform.user` + project billing configured per model — more setup complexity for the same model
- Vertex AI is worth migrating to when you need: fine-tuning, enterprise SLAs, or regional data residency
- Model: `gemini-2.0-flash-lite` (matches what the existing PWA uses, cheapest Gemini option, latency ~1-2s)

### 4d. Deadline Engine

Pure computation. No AI. No Firestore writes. Stateless function.

```python
# services/deadline_engine.py

from datetime import date, timedelta
from dataclasses import dataclass
from typing import Literal

Verdict = Literal["deep_work", "surface", "lazy"]

@dataclass
class DeadlineEngineInput:
    start_date: date
    current_target: date
    today: date
    last_14_verdicts: list[Verdict | None]   # None = no reflection logged that day
    weekly_problems_actual: int
    weekly_problems_target: int              # From 24-week plan for current week

@dataclass  
class DeadlineEngineResult:
    days_delta: int                          # Positive = extend, negative = shrink
    new_target: date
    reason: str
    days_ahead: int                          # How many days ahead vs ideal pace
    days_behind: int                         # How many days behind vs ideal pace
    pace_status: Literal["ahead", "on_track", "behind"]
    recommendation: str


def calculate_deadline_adjustment(inp: DeadlineEngineInput) -> DeadlineEngineResult:
    """
    Pure function. No side effects. No external calls. Fully unit-testable.
    
    Algorithm:
    1. Count consecutive lazy/missed days in the last 14 days (working backwards from today)
    2. Count extra problems this week vs target
    3. Calculate extension (lazy days) and shrink (extra problems)
    4. Apply caps: max +3 days/week extension, max -2 days/week shrink
    5. Compute new target date
    6. Compute pace status (ahead/on_track/behind)
    """
    days_delta = 0
    
    # --- Extension logic: consecutive lazy/missed days ---
    # Walk backwards through last 14 verdicts
    # "Consecutive" = streak starting from most recent day
    consecutive_bad_days = 0
    for verdict in reversed(inp.last_14_verdicts):
        if verdict is None or verdict == "lazy":
            consecutive_bad_days += 1
        else:
            break  # Streak broken
    
    # Rule: 2+ consecutive lazy/missed days → extend by 1 day per pair
    if consecutive_bad_days >= 2:
        extension = consecutive_bad_days // 2   # 2 bad days = +1, 4 bad days = +2, etc.
        days_delta += extension
    
    # --- Shrink logic: extra problems this week ---
    extra_problems = max(0, inp.weekly_problems_actual - inp.weekly_problems_target)
    if extra_problems >= 3:
        # Every 3 extra problems = 1 day shrink
        shrink = extra_problems // 3
        days_delta -= shrink
    
    # --- Apply weekly caps ---
    # Max extension: +3 days per week
    # Max shrink: -2 days per week
    days_delta = min(days_delta, 3)
    days_delta = max(days_delta, -2)
    
    new_target = inp.current_target + timedelta(days=days_delta)
    
    # --- Pace calculation ---
    total_days = (inp.current_target - inp.start_date).days
    elapsed_days = (inp.today - inp.start_date).days
    ideal_pct = elapsed_days / max(total_days, 1)
    
    # Use problem count as pace proxy (can be extended with reflection count)
    # For now: assume target is 150 problems total (NeetCode 150 baseline)
    TOTAL_TARGET_PROBLEMS = 150
    actual_pct = inp.weekly_problems_actual / max(TOTAL_TARGET_PROBLEMS, 1)
    
    days_remaining = (new_target - inp.today).days
    total_remaining_days = total_days - elapsed_days
    
    if total_remaining_days > 0:
        pace_ratio = days_remaining / total_remaining_days
    else:
        pace_ratio = 1.0
    
    if consecutive_bad_days >= 3:
        pace_status = "behind"
        days_behind = consecutive_bad_days
        days_ahead = 0
    elif days_delta < 0:
        pace_status = "ahead"
        days_ahead = abs(days_delta)
        days_behind = 0
    else:
        pace_status = "on_track"
        days_ahead = 0
        days_behind = 0
    
    # --- Human-readable reason ---
    reason = _build_reason(consecutive_bad_days, extra_problems, days_delta)
    recommendation = _build_recommendation(pace_status, consecutive_bad_days, inp)
    
    return DeadlineEngineResult(
        days_delta=days_delta,
        new_target=new_target,
        reason=reason,
        days_ahead=days_ahead,
        days_behind=days_behind,
        pace_status=pace_status,
        recommendation=recommendation,
    )


def _build_reason(consecutive_bad: int, extra_problems: int, delta: int) -> str:
    if delta == 0:
        return "Pace is on track. No adjustment needed."
    if delta > 0:
        return (
            f"You missed {consecutive_bad} consecutive days of focused work. "
            f"Deadline extended by {delta} day{'s' if delta > 1 else ''}."
        )
    return (
        f"You solved {extra_problems} extra problems beyond this week's target. "
        f"Deadline moved up by {abs(delta)} day{'s' if abs(delta) > 1 else ''}."
    )


def _build_recommendation(
    status: str, consecutive_bad: int, inp: DeadlineEngineInput
) -> str:
    if status == "behind":
        return (
            f"You're {consecutive_bad} days behind pace. "
            f"Focus on logging reflections and completing your daily review queue "
            f"to stop the deadline from extending further."
        )
    if status == "ahead":
        return "You're ahead of pace. Maintain consistency and tackle harder patterns."
    return "You're on track. Keep your daily reflection habit and review queue clear."
```

**Why this is stateless and testable:**
- Takes only primitive inputs (dates, ints, list of strings)
- Returns only primitive outputs
- Zero imports of Firestore, HTTP clients, or datetime.now()
- `today` is passed in as a parameter — makes it trivially testable with any date
- Every edge case (no reflections, first week, day 0) can be covered with a unit test in under 100 lines

### 4e. Dashboard Aggregation Endpoint

The home screen needs these four bento card values plus deadline info in a single HTTP call:

```
GET /dashboard
Response:
{
  "daysLeft": 184,
  "targetDate": "2026-12-15",
  "paceStatus": "on_track",
  "pacePercent": 36,
  "streakCount": 12,
  "longestStreak": 14,
  "dueReviewsCount": 2,
  "dueReviews": [
    { "id": "...", "name": "Two Sum", "pattern": "arrays", "tag": "Day 7 review" }
  ],
  "totalProblemsSolved": 42,
  "neetcodeProgress": { "solved": 42, "total": 150 },
  "avgAccuracy": 78,
  "todayTasks": [
    { "id": "...", "label": "Solve NeetCode — Stack (7)", "done": false, "estimate": "45 min" }
  ],
  "weeklyPace": {
    "problemsActual": 8,
    "problemsTarget": 10,
    "systemDesignActual": 3,
    "systemDesignTarget": 5,
    "reflectionsActual": 5,
    "reflectionsTarget": 7
  }
}
```

**Firestore reads needed (6 reads, one round-trip each via async):**
1. `users/{uid}` — streakCount, targetDate, totalProblemsLogged, currentPhase
2. `streaks/{uid}` — current streak, lastActiveDate
3. `problems` query: userId=uid, nextReviewDate <= today, mastered=false (due reviews)
4. `problems` query: userId=uid, createdAt >= weekStart (weekly problem count)
5. `reflections` query: userId=uid, date >= weekStart (weekly reflections)
6. `weeklySnapshots` latest for userId=uid (weekly pace targets)

**Why a single endpoint instead of multiple:**
- The home screen renders all of this simultaneously. Six separate client requests = six round trips = ~600ms vs ~200ms for one batched server-side request.
- Firestore reads from Cloud Run are low-latency (<10ms per read within the same GCP region). Six async reads in parallel = effective latency of the slowest single read.
- Battery/bandwidth cost on mobile matters. One request per screen load, not six.
- Rate limit concerns: six endpoints = six Firebase token verifications. One endpoint = one.

---

## 5. Cost Analysis

### GCP Services — 100 MAU Estimate

Assumptions: 100 MAU, 30% DAU = 30 daily active users, average 5 writes + 25 reads per DAU per day.

| Service | Free Tier | 100 MAU Usage | Monthly Cost After Free Tier |
|---|---|---|---|
| **Cloud Run** | 2M req/month, 360K CPU-s, 180K GB-s | ~3K requests/month, <1K CPU-s | $0 (well within free tier) |
| **Firestore** | 50K reads/day, 20K writes/day, 1GB | 750 reads/day, 150 writes/day | $0 (5-10% of free tier) |
| **Firebase Auth** | 10K verifications/month (phone), unlimited for Google/email | ~3K verifications/month | $0 |
| **Gemini 2.0 Flash Lite** | No free tier via AI Studio for server-side | ~30 calls/day (1 per DAU) × 30 days = 900 calls/month | ~$0.007/1K output tokens × 900 calls × ~500 tokens avg = **~$3/month** |
| **Cloud Scheduler** | 3 free jobs/month | 2 jobs (nightly deadline + weekly summary) | $0 |
| **Secret Manager** | 6 secret versions free, 10K access operations free | 3 secrets × ~3K accesses/month = 9K | $0 |
| **Cloud Storage** (Artifact Registry for Docker) | 0.5GB free | ~200MB image | $0 |
| **Cloud Build** | 120 build-minutes/day free | ~10 min per deploy, ~20 deploys/month = 200 min | ~$0.003/min × 80 excess min = **<$1/month** |
| **Total** | | | **~$4/month** |

### Cost Scaling

| MAU | Estimated Monthly Cost | Bottleneck |
|---|---|---|
| 100 | $4 | Gemini calls |
| 500 | $18 | Gemini calls (5x), Cloud Run still free |
| 1,000 | $38 | Gemini calls, Firestore approaching free tier limits |
| 2,000 | $100 | Firestore paid reads begin (~$0.036/100K reads), Gemini $70 |
| 5,000 | $280 | Firestore: $30, Gemini: $175, Cloud Run: $50 |

**Budget runway at $1,050:** Covers ~2 years at 100 MAU, or ~8 months at 500 MAU, or ~3 months at 1,000 MAU.

**Cost optimization levers (if needed):**
1. Cache the `/dashboard` response in Firestore with a 5-minute TTL — reduces reads by ~50%
2. Gemini quota is already 1 call/user/day — no change needed
3. Batch the nightly deadline job to process all users in one Cloud Run invocation (already the plan)
4. Move to Vertex AI only if you need volume discounts (>10M tokens/month)

---

## 6. Deployment Architecture

### 6.1 Cloud Run Service Config

```yaml
# cloud-run-service.yaml
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: prepsde-backend
  annotations:
    run.googleapis.com/ingress: all
spec:
  template:
    metadata:
      annotations:
        autoscaling.knative.dev/minScale: "0"
        autoscaling.knative.dev/maxScale: "3"
        run.googleapis.com/cpu-throttling: "true"
    spec:
      containerConcurrency: 80
      timeoutSeconds: 30
      serviceAccountName: prepsde-backend@PROJECT_ID.iam.gserviceaccount.com
      containers:
        - image: REGION-docker.pkg.dev/PROJECT_ID/prepsde/backend:latest
          resources:
            limits:
              cpu: "1"
              memory: 512Mi
          env:
            - name: GOOGLE_CLOUD_PROJECT
              value: PROJECT_ID
            - name: FIRESTORE_DATABASE
              value: "(default)"
          envFrom:
            - secretRef:
                name: prepsde-secrets
```

**min instances: 0** — scales to zero when no traffic, zero idle cost. Cold start is ~2-3s for this Python image; acceptable for a dev tool used at specific times of day.

### 6.2 Dockerfile

```dockerfile
FROM python:3.11-slim AS base

# Create non-root user
RUN groupadd -r appuser && useradd -r -g appuser appuser

WORKDIR /app

# Install dependencies first (layer caching)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Switch to non-root user
USER appuser

# PORT is injected by Cloud Run
ENV PORT=8080

EXPOSE $PORT

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:${PORT}/health')"

CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT} --workers 1"]
```

### 6.3 Environment Variables

```bash
# .env.example — copy to .env for local dev, use Secret Manager in production

# Firebase / GCP
GOOGLE_CLOUD_PROJECT=your-gcp-project-id
FIREBASE_SERVICE_ACCOUNT_PATH=./firebase-service-account.json  # local only
FIRESTORE_DATABASE=(default)

# Gemini (Google AI Studio)
GEMINI_API_KEY=your-gemini-api-key-here
GEMINI_MODEL=gemini-2.0-flash-lite

# Cloud Scheduler authentication
SCHEDULER_SECRET=generate-a-secure-random-string-here

# CORS
ALLOWED_ORIGINS=http://localhost:8081,https://prepsde.web.app

# App
LOG_LEVEL=INFO
ENVIRONMENT=development  # "development" | "production"
```

In production, `GEMINI_API_KEY` and `SCHEDULER_SECRET` are stored in Secret Manager and mounted as environment variables via the Cloud Run service's secret references. The Firebase service account credentials are handled via the Cloud Run service account identity (workload identity) — no JSON file needed in production.

### 6.4 CI/CD Pipeline

```
GitHub main branch push
  → Cloud Build trigger (cloudbuild.yaml)
    Step 1: docker build -t REGION-docker.pkg.dev/PROJECT_ID/prepsde/backend:$SHORT_SHA .
    Step 2: docker push ...
    Step 3: gcloud run deploy prepsde-backend --image ... --region asia-south1
  → Cloud Run deploys new revision
  → Traffic gradually shifted to new revision (canary optional at this scale)
```

`cloudbuild.yaml` lives at `apps/backend/cloudbuild.yaml`. The Cloud Build service account needs:
- `roles/run.developer`
- `roles/artifactregistry.writer`
- `roles/iam.serviceAccountUser` (to deploy as the backend service account)

**Region choice:** `asia-south1` (Mumbai) — lowest latency for Indian users, and all GCP free tier services are available in this region.

### 6.5 Firebase Security Rules

Firestore security rules lock down direct client access as a defense-in-depth measure. Since the backend uses a service account that bypasses these rules, they only protect against direct SDK abuse from the client:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Block all direct client writes — all writes go through the backend
    match /{document=**} {
      allow read: if request.auth != null && request.auth.uid == resource.data.userId;
      allow write: if false;  // Backend uses service account — bypasses rules
    }
    
    // Users can read their own user document
    match /users/{uid} {
      allow read: if request.auth != null && request.auth.uid == uid;
    }
    
    // Streaks are readable directly (for real-time listeners)
    match /streaks/{uid} {
      allow read: if request.auth != null && request.auth.uid == uid;
    }
  }
}
```

---

## 7. What NOT to Build Yet (Post-MVP Deferrals)

| Feature | Reason to Defer |
|---|---|
| **Accountability Pods** | Requires user-matching algorithm, group data model, privacy controls for shared reflections, and moderation. Independent feature — add after core loop is proven. |
| **Weekly Summary Card generation** | Cloud Scheduler + Gemini call for summary writing. Can ship with manual/rule-based summaries first. |
| **Phase Gate enforcement** | Requires defining exact gate criteria per role, building the check logic, and UI for blocked state. Defer until core tracking is working. |
| **Recovery Plan (AI-generated 2-day plan)** | Requires a second Gemini call per deadline extension event. Defer until quota management is proven and you have usage data. |
| **Real-World Engineering Stories Feed** | Requires a content database (or AI generation), curation pipeline, and linking logic to current phase. Separate content system entirely. |
| **Pattern Notebook (per-pattern page)** | Good feature, low urgency. Can be a static screen populated from problem data. |
| **Concept Map / Skill Tree** | Frontend-heavy feature, no backend complexity, but requires design work. Defer. |
| **Email/push notifications** | Firebase Cloud Messaging setup + notification permission flow. MVP works without it. |
| **Export Data** | Nice to have, not blocking anything. |
| **Teach-Back / Feynman mode** | Deferred in features.md itself. |
| **NeetCode 150 completion tracker** | Can be computed client-side from problems data — no backend endpoint needed. |

---

## 8. Open Questions (Product Owner Decisions Required)

**1. Hard vs soft Phase Gate blocking**
When a user hasn't met the Phase 1 gate criteria (60+ problems, 4 weeks of reflections at surface or above), does the app hard-block their progression (they literally cannot access Phase 2 content) or soft-warn (they see a banner but can proceed)? Hard blocks are motivating but create support burden. Soft warns are safer but can be ignored. This decision changes the `POST /users/me/advance-phase` endpoint design significantly.

**2. Can users reject or override a deadline adjustment?**
When the deadline engine extends a user's deadline by 1-2 days, can the user tap "Reject" to undo it? Or is it enforced? Enforced adjustments are more honest about reality but will generate frustration. Overrides require storing the override in `deadlineAdjustments` and applying a separate cap on how many overrides are allowed. features.md lists this as an open question — needs a product decision before building the endpoint.

**3. Daily reflection uniqueness rule**
Can a user submit multiple reflections in one day (e.g., a morning and an evening entry)? The current schema uses `{userId}_{date}` as the document ID, which enforces one per day. If you want multiple per day, the schema needs to change to a sequential ID and the streak/deadline logic needs to pick which reflection to use for each day's evaluation. Recommend: one per day (keep it simple, matches the UI design which shows one per day in the list).

**4. Gemini quota reset timezone**
The daily Gemini quota resets "at midnight" — but midnight where? If it resets at midnight UTC, Indian users (UTC+5:30) hit a new quota at 5:30 AM IST, which means two Gemini calls could happen in what feels like the same "day" to the user (one at 11 PM, one at 12:30 AM). Recommend: reset at midnight IST (`Asia/Kolkata`), but this requires storing the user's timezone or hard-coding IST for the MVP. Decide before shipping.

**5. Accountability Pod matching algorithm**
features.md asks whether pods should be invite-only or matchmade. This affects the data model (pods collection, membership management, weekly leaderboard aggregation) and the matching logic (by target company? prep stage? start date proximity?). The backend implications are significant — pods require a separate collection, write operations on multiple user documents, and potentially a background job for matching. Decide scope before including in any sprint.

---

## 9. API Endpoint Reference

Quick reference for all endpoints. All protected routes require `Authorization: Bearer <firebase_id_token>`.

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/health` | None | Service health check |
| POST | `/users/onboard` | Firebase | First-time user setup (create user doc) |
| GET | `/users/me` | Firebase | Get current user profile |
| PUT | `/users/me` | Firebase | Update user profile (name, targetRole, etc.) |
| GET | `/dashboard` | Firebase | Aggregated home screen data (bento cards, tasks, reviews) |
| POST | `/problems` | Firebase | Log a new DSA problem |
| GET | `/problems` | Firebase | List problems with filters (pattern, difficulty, dueToday, mastered) |
| GET | `/problems/{id}` | Firebase | Get problem detail |
| PUT | `/problems/{id}` | Firebase | Update problem (notes, etc.) |
| DELETE | `/problems/{id}` | Firebase | Delete problem |
| PUT | `/problems/{id}/review` | Firebase | Mark review complete or struggled (triggers SRS recalculation) |
| POST | `/reflections` | Firebase | Submit daily reflection (triggers AI pre-screen) |
| GET | `/reflections` | Firebase | List past reflections (paginated) |
| GET | `/reflections/{date}` | Firebase | Get reflection for a specific date (YYYY-MM-DD) |
| GET | `/streaks/me` | Firebase | Get current streak data |
| GET | `/deadline` | Firebase | Current deadline state + last 5 adjustments |
| GET | `/progress` | Firebase | Analytics data (heatmap, topic mastery, weekly summaries) |
| POST | `/ai/coach` | Firebase | AI coach evaluation of a reflection (pre-screen + Gemini) |
| POST | `/deadline/nightly` | Scheduler | Nightly deadline recalculation for all active users |
| POST | `/progress/weekly` | Scheduler | Weekly snapshot generation for all active users |

**Note on `/ai/coach` vs submission in `/reflections`:**
The client calls `POST /reflections` to save the reflection data, and separately calls `POST /ai/coach` to get the AI evaluation. This decouples persistence from AI evaluation — if Gemini is slow or fails, the reflection is already saved. The coach endpoint returns the verdict and stores it back into the reflection document via `reflections/{id}` update. This is the cleaner design compared to bundling AI evaluation into the reflection create endpoint.
