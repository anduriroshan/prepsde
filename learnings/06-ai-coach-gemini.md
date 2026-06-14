# 06 — AI Coach & Gemini Integration

## What the AI Coach Does

When a user saves their daily reflection, the backend evaluates it and returns:
1. A **verdict**: `deep_work`, `surface`, or `lazy`
2. **Personalized feedback**: 2-4 sentences specific to what they wrote
3. A **micro-lesson**: A real engineering concept (not motivational fluff) relevant to their current phase

But here's the key insight: **most reflections never reach Gemini at all.**

---

## The Three-Stage Pipeline

```
Reflection submitted
       │
       ▼
  ┌─────────────┐      Fail: < 30 chars
  │ Stage 1:    │ ──────────────────────► Return hardcoded "lazy" response
  │ Length      │                          (no Gemini call, no Firestore read)
  │ Check      │
  └──────┬──────┘
         │ Pass
         ▼
  ┌─────────────┐      Fail: no DSA/SD keywords
  │ Stage 2:    │ ──────────────────────► Return hardcoded "surface" response
  │ Keyword     │                          (no Gemini call, no Firestore read)
  │ Check      │
  └──────┬──────┘
         │ Pass
         ▼
  ┌─────────────┐      Fail: already called today
  │ Stage 3:    │ ──────────────────────► Return hardcoded "quota" response
  │ Daily       │                          (1 Firestore read, no Gemini call)
  │ Quota       │
  └──────┬──────┘
         │ Pass
         ▼
  ┌─────────────┐
  │ Stage 4:    │ ──────────────────────► Return Gemini response
  │ Gemini      │                          (1 Firestore read + 1 Gemini call)
  │ API Call    │
  └─────────────┘
```

### Why This Pipeline Matters

**Cost control.** Gemini 2.0 Flash Lite is cheap (~$0.007 per 1K output tokens), but it's not free. At 30 DAU:
- Without pre-screening: 30 Gemini calls/day × 30 days = 900 calls/month
- With pre-screening: realistic estimate is 40-50% of reflections are low-quality → only ~450-500 Gemini calls/month
- Savings: ~50% on Gemini costs

**Latency.** Gemini takes 1-3 seconds to respond. The pre-screen takes <1ms (it's just string operations). Users who submit lazy reflections get instant feedback instead of waiting 2 seconds for AI to tell them they slacked off.

---

## Stage 1: Length Check

```python
if len(combined_text) < 30:
    return PreScreenResult.TOO_SHORT
```

**Why 30 characters, not word count?**

Word count is gameable. "twopointers" is 1 word but 11 characters. A user could write "I did twopointers slidingwindow binarysearch" — that's 4 words describing real work. Character count is a better proxy for effort.

30 characters is approximately one sentence. If someone can't write one sentence about what they learned, they didn't learn enough to evaluate.

### Stage 2: Keyword Check

```python
DSA_KEYWORDS = {"array", "tree", "dp", "sliding window", "binary search", ...}
SYSDESIGN_KEYWORDS = {"scalability", "cache", "load balancer", ...}

has_technical = any(kw in combined.lower() for kw in ALL_KEYWORDS)
```

**Why substring matching instead of exact word matching?**

Because people concatenate terms: "slidingwindow", "binarysearch", "hashmap". Substring matching catches these. The false positive rate is acceptable — if someone writes "I cached my lunch" we don't care about the minor inaccuracy because Gemini will handle the nuance.

**Why not use NLP/embeddings for the pre-screen?**

1. It would add latency (embedding computation)
2. It would add a dependency (an embedding model or API call)
3. The pre-screen is a **cost filter**, not a quality evaluator. It only needs to catch obviously lazy entries. Gemini handles the nuanced evaluation.

### Stage 3: Daily Quota

```python
async def check_gemini_quota(uid: str, db) -> bool:
    user_doc = await db.collection("users").document(uid).get()
    last_called = user_data.get("geminiLastCalledAt")
    return last_called_date < today_utc
```

**One Gemini call per user per day.** This is a hard cap, not a soft suggestion.

**Why per-user, not global?** A global rate limit would mean one active user could exhaust the quota for everyone. Per-user quotas are fair and predictable.

---

## The Gemini Prompt

```python
SYSTEM_PROMPT = """You are the PrepSDE AI Coach. You evaluate daily prep
reflections from software engineers preparing for senior-level SDE interviews.

Output ONLY valid JSON matching this exact schema:
{
  "verdict": "deep_work" | "surface" | "lazy",
  "feedback": string,
  "lessonTitle": string,
  "lessonContent": string
}

Do not output anything except the JSON object. No markdown, no preamble."""
```

### Prompt Design Decisions

**1. Structured JSON output with `responseMimeType: "application/json"`**

This tells Gemini to only output valid JSON. Without it, Gemini might add markdown formatting, explanatory text, or code fences around the JSON — breaking `JSON.parse()`.

**2. Explicit schema in the prompt**

Even with `responseMimeType`, you need to tell Gemini what fields to include. The schema is repeated in the prompt because LLMs follow instructions better when the expected output is clearly defined.

**3. Three-tier verdict, not binary**

Binary ("good" vs "bad") loses information. Three tiers let you:
- `deep_work`: Teach an advanced concept related to what they studied
- `surface`: Teach a foundational concept they should know
- `lazy`: Teach the meta-skill of deliberate practice

**4. "Do not output anything except the JSON object"**

LLMs love to be helpful. Without this instruction, Gemini will prepend "Here's my evaluation:" or append "Let me know if you need anything else!" — both break JSON parsing.

---

## Why Gemini 2.0 Flash Lite?

| Model | Latency | Cost (per 1K output tokens) | Quality |
|-------|---------|---------------------------|---------|
| Gemini 2.0 Flash Lite | ~1-2s | ~$0.007 | Good enough for coaching |
| Gemini 2.0 Flash | ~1-3s | ~$0.04 | Better, but 6x more expensive |
| Gemini 2.5 Pro | ~3-8s | ~$0.10+ | Overkill for this use case |
| GPT-4o | ~2-5s | ~$0.06 | Requires OpenAI account, cross-vendor |

**Flash Lite wins because:**
- The task (evaluate a reflection, write 3 paragraphs) is not complex — it doesn't need a frontier model
- Latency matters for UX — the user is waiting for feedback after submitting
- At ~$0.007/1K tokens, 900 calls/month costs ~$3

### Why Google AI Studio REST Instead of Vertex AI?

| Criterion | AI Studio (REST) | Vertex AI |
|-----------|-----------------|-----------|
| **Setup** | Just an API key in Secret Manager | Service account with `roles/aiplatform.user`, enable Vertex AI API, configure regional endpoints |
| **Authentication** | API key in query parameter | OAuth2 / workload identity |
| **Same model?** | Yes, same Gemini models | Yes, same Gemini models |
| **When to upgrade** | Works until you need fine-tuning, enterprise SLAs, or data residency | Required for enterprise features |

For an MVP with one API key, AI Studio is simpler. Migration to Vertex AI is a URL change + auth change, not a rewrite.

---

## Hardcoded Fallback Responses

When Gemini isn't called, the user still gets useful feedback — not errors or empty states.

**Lazy response** (pre-screen failed — too short):
> "This reflection doesn't give me enough to work with. A good reflection takes 2 minutes..."

**Surface response** (pre-screen failed — no keywords):
> "You showed up — that counts. But I need more specifics..."

**Quota exceeded response**:
> "You've already received AI feedback today. Keep going..."

Each fallback includes a real micro-lesson (not a placeholder). The lazy response teaches deliberate practice. The surface response teaches system design frameworks. The quota response teaches spaced repetition theory.

**Why hardcode instead of calling Gemini with a different prompt?** Because the whole point of the pre-screen is to avoid Gemini calls. Calling Gemini to tell someone their reflection is too short would defeat the purpose.

---

## Error Handling: Graceful Degradation

```python
try:
    gemini_response = await call_gemini(body, uid)
    return gemini_response
except GeminiError as e:
    logger.error(f"Gemini call failed: {e}")
    return hardcoded_surface_response(body)  # NOT a 500 error
```

If Gemini is down, slow, or returns garbage, the user sees a surface-level response — not an error screen. The reflection is already saved (separate endpoint). The streak still counts. The only degradation is the AI verdict quality.

---

## Questions You Should Be Able to Answer

1. "Walk me through what happens when a user submits a reflection." (4-stage pipeline)
2. "Why do most reflections never reach Gemini?" (Pre-screen filters lazy/vague entries — saves cost and latency)
3. "Why 30 characters as the threshold, not word count?" (Character count is harder to game — "twopointers" is 1 word, 11 chars)
4. "Why substring matching for keywords instead of NLP?" (Pre-screen is a cost filter, not a quality evaluator — simplicity wins)
5. "What model do you use and why?" (Flash Lite — cheapest, fast enough, task isn't complex)
6. "Why AI Studio REST instead of Vertex AI?" (Simpler setup — just an API key. Vertex AI adds IAM complexity for the same model.)
7. "What happens if Gemini is down?" (Graceful degradation — hardcoded surface response, no 500 error)
8. "How do you prevent prompt injection?" (The user's text goes into the USER message, not the SYSTEM prompt. Structured output via `responseMimeType` prevents free-text leakage.)
