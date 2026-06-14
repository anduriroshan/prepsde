import logging
from enum import Enum
from typing import Optional
from datetime import datetime, timezone
from app.models.ai_coach import CoachResponse

logger = logging.getLogger(__name__)

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


class PreScreenResult(str, Enum):
    PASSED = "passed"
    TOO_SHORT = "too_short"
    NO_KEYWORDS = "no_keywords"
    QUOTA_EXCEEDED = "quota_exceeded"


def prescreen_reflection(text: str) -> tuple[PreScreenResult, Optional[str]]:
    combined = text.lower().strip()
    if len(combined) < 30:
        return PreScreenResult.TOO_SHORT, "Reflection is too short to evaluate."
    has_technical = any(kw in combined for kw in ALL_TECHNICAL_KEYWORDS)
    if not has_technical:
        return PreScreenResult.NO_KEYWORDS, "No DSA or system design content detected."
    return PreScreenResult.PASSED, None


async def check_gemini_quota(uid: str, db) -> bool:
    user_doc = await db.collection("users").document(uid).get()
    if not user_doc.exists:
        return True
    user_data = user_doc.to_dict()
    last_called = user_data.get("geminiLastCalledAt")
    if not last_called:
        return True
    last_called_dt = datetime.fromisoformat(last_called.replace("Z", "+00:00"))
    today_utc = datetime.now(timezone.utc).date()
    return last_called_dt.date() < today_utc


async def record_gemini_call(uid: str, db) -> None:
    await db.collection("users").document(uid).update({
        "geminiLastCalledAt": datetime.now(timezone.utc).isoformat()
    })


def hardcoded_lazy_response() -> CoachResponse:
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
        prescreenResult="too_short",
        geminiCalled=False,
    )


def hardcoded_surface_response(prescreen: str = "no_keywords") -> CoachResponse:
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
        prescreenResult=prescreen,
        geminiCalled=False,
    )


def hardcoded_quota_exceeded_response() -> CoachResponse:
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
        prescreenResult="quota_exceeded",
        geminiCalled=False,
    )


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


async def call_gemini(content: str, rating: Optional[int], uid: str) -> CoachResponse:
    import json
    import google.generativeai as genai
    from app.config import settings

    genai.configure(api_key=settings.GEMINI_API_KEY)
    model = genai.GenerativeModel(
        model_name=settings.GEMINI_MODEL,
        system_instruction=GEMINI_SYSTEM_PROMPT,
    )

    user_message = f"""Evaluate this prep reflection:

{content}

Day rating: {rating}/5"""

    try:
        response = model.generate_content(user_message)
        raw = response.text.strip()
        # Strip markdown code fences if present
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        parsed = json.loads(raw)
        verdict = parsed.get("verdict")
        if verdict not in ("deep_work", "surface", "lazy"):
            raise ValueError(f"Invalid verdict: {verdict}")
        return CoachResponse(
            verdict=verdict,
            feedback=parsed["feedback"],
            lessonTitle=parsed["lessonTitle"],
            lessonContent=parsed["lessonContent"],
            prescreenResult="passed",
            geminiCalled=True,
        )
    except Exception as e:
        logger.error(f"Gemini call failed for uid={uid}: {e}")
        raise
