# 09 — Cost & Scaling Strategy

## The Free Tier Math

Google Cloud offers generous free tiers. Here's exactly what PrepSDE uses and how much headroom exists.

---

## Current Usage at 30 DAU (Daily Active Users)

| Service | Free Tier (Monthly) | Our Usage | % Used | Monthly Cost |
|---------|-------------------|-----------|--------|-------------|
| **Cloud Run** | 2M requests, 360K CPU-s | ~3K requests, <1K CPU-s | <0.2% | **$0** |
| **Firestore reads** | 1.5M/month (50K/day) | ~22K/month (750/day) | 1.5% | **$0** |
| **Firestore writes** | 600K/month (20K/day) | ~4.5K/month (150/day) | 0.8% | **$0** |
| **Firestore storage** | 1 GB | ~10 MB | 1% | **$0** |
| **Firebase Auth** | Unlimited (email/Google) | ~100 accounts | — | **$0** |
| **Gemini 2.0 Flash Lite** | No free tier (pay per token) | ~500 calls/month × 500 tokens | — | **~$1.75** |
| **Secret Manager** | 6 versions, 10K accesses | 2 secrets, ~3K accesses | 30% | **$0** |
| **Artifact Registry** | 0.5 GB storage | ~200 MB image | 40% | **$0** |
| **Cloud Build** | 120 build-min/day | ~10 min/deploy, ~4 deploys/month | <3% | **$0** |
| **Cloud Scheduler** | 3 jobs free | 2 jobs (nightly + weekly) | 67% | **$0** |
| **Total** | | | | **~$2/month** |

**The entire system costs about $2/month, almost all of which is Gemini API calls.**

---

## Scaling Projections

| MAU | Est. DAU (30%) | Firestore Reads/day | Gemini Calls/month | Monthly Cost | Bottleneck |
|-----|---------------|--------------------|--------------------|-------------|-----------|
| 30 | 10 | 250 | 300 | ~$2 | None |
| 100 | 30 | 750 | 900 | ~$4 | Gemini |
| 500 | 150 | 3,750 | 4,500 | ~$18 | Gemini |
| 1,000 | 300 | 7,500 | 9,000 | ~$38 | Gemini + Firestore approaching limit |
| 2,000 | 600 | 15,000 | 18,000 | ~$100 | Firestore paid reads begin |
| 5,000 | 1,500 | 37,500 | 45,000 | ~$280 | All services in paid tier |

### What Breaks First?

**1. Gemini API costs** — This scales linearly with users. Every DAU who writes a quality reflection triggers one Gemini call. No caching possible (each reflection is unique).

**2. Firestore daily read limit** — At ~2,000 DAU, you exceed 50K reads/day. The dashboard endpoint alone makes ~6 reads per user per session.

**3. Cloud Run** — Almost never the bottleneck. 2M free requests/month = 66K requests/day. You'd need 2,200 DAU each making 30 requests/day to even approach this.

---

## Cost Optimization Levers

### Lever 1: Cache the Dashboard Response (saves ~50% Firestore reads)

The dashboard makes 6 parallel Firestore reads. But the data only changes when the user completes a task, saves a reflection, or logs a problem. Cache the response in Firestore with a 5-minute TTL:

```python
# Pseudocode
cached = await get_cached_dashboard(uid)
if cached and (now - cached.timestamp) < timedelta(minutes=5):
    return cached.data

# Otherwise, compute fresh and cache
dashboard = await compute_dashboard(uid)
await cache_dashboard(uid, dashboard)
return dashboard
```

**Cost of this lever:** ~0 (just an extra Firestore read + write for the cache doc)
**Savings:** Cuts dashboard reads from ~6/session to ~1/session for repeated views

### Lever 2: Pre-screen Gemini Calls More Aggressively (saves ~30-50% Gemini cost)

The current pre-screen catches obviously lazy reflections. You could add:
- **Duplicate detection**: If today's reflection is >80% similar to yesterday's, skip Gemini
- **Minimum substantive words**: Require at least 3 technical keywords, not just 1
- **Time-of-day heuristic**: A reflection submitted at 6:00 AM (when the user just woke up) is less likely to be genuine than one at 9:00 PM

### Lever 3: Switch to a Cheaper Gemini Model (saves ~60% Gemini cost)

If Google releases an even cheaper model (Flash Nano or similar), switch with a one-line config change. The prompt is model-agnostic.

### Lever 4: Firestore Read Optimization

- **Paginate reflections list**: Currently loads all reflections. At 180 reflections (6 months), this is fine. At 1,000 users × 180 reflections = 180K documents, add pagination (limit 20, cursor-based).
- **Denormalize more**: Store `streakCount` on the user document instead of computing it from reflections on every read.
- **Use Firestore Bundles**: Pre-compute and package commonly-read data into a bundle that clients can load in one operation.

### Lever 5: Move to Vertex AI for Volume Discounts

At >10M tokens/month, Vertex AI offers committed-use discounts. Migration is a URL change + auth change:

```python
# Before (AI Studio)
url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"

# After (Vertex AI)  
url = f"https://{region}-aiplatform.googleapis.com/v1/projects/{project}/locations/{region}/publishers/google/models/{model}:generateContent"
# + OAuth2 auth instead of API key
```

---

## Budget Runway

With $1,050 in GCP credits:

| Scenario | Monthly Cost | Credits Last |
|----------|-------------|-------------|
| 100 MAU, steady | $4 | ~21 years (!) |
| 500 MAU, growing | $18 | ~4.9 years |
| 1,000 MAU | $38 | ~2.3 years |
| 2,000 MAU | $100 | ~10.5 months |
| 5,000 MAU | $280 | ~3.7 months |

**Realistic scenario:** You're building this for yourself and maybe sharing with friends. 30-100 MAU for the first year = $24-48 total. The credits last effectively forever.

---

## What "Production-Ready" Actually Costs

If you wanted to make this a real product with SLA guarantees:

| Additional Cost | What It Buys | Needed At |
|----------------|-------------|-----------|
| **min-instances=1** (~$5/month) | Eliminates cold starts | When you want instant response times |
| **Cloud Logging + Monitoring** (~$0) | Structured logs, error alerting | Day 1 (it's free) |
| **Custom domain + SSL** (~$12/year) | `api.prepsde.app` instead of `*.run.app` | When sharing with others |
| **Uptime monitoring** (~$0) | Google Cloud Monitoring free tier | Day 1 |
| **Error tracking (Sentry)** (~$0) | Catches unhandled exceptions with stack traces | When users report bugs |

**Total for a "real" MVP:** ~$7/month above the current $2 = ~$9/month.

---

## Questions You Should Be Able to Answer

1. "How much does your backend cost to run?" (~$2/month, almost entirely Gemini API)
2. "What's the most expensive component and why?" (Gemini — each call costs tokens, can't be cached because reflections are unique)
3. "What breaks first at scale?" (Firestore daily read limit at ~2K DAU, then Gemini costs)
4. "How would you cut costs by 50%?" (Cache dashboard response in Firestore with 5-min TTL → halves reads)
5. "How long do your GCP credits last?" (At current usage: effectively forever. At 1K MAU: ~2 years)
6. "What would you change if you suddenly had 10,000 users?" (Firestore read caching, paginate queries, consider PostgreSQL migration, Vertex AI for volume discounts)
7. "Why is Cloud Run $0?" (Free tier is 2M requests/month — orders of magnitude beyond current usage)
