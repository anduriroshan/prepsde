# 03 — Cloud Run Deep Dive

## What Is Cloud Run?

Cloud Run is Google's **fully managed container runtime**. You give it a Docker image, it runs it. You don't manage servers, operating systems, patches, or scaling rules.

Think of it as: "I wrote a web server. Run it somewhere. I don't care where."

---

## How Cloud Run Actually Works

When you deployed with `gcloud run deploy`, here's what happened behind the scenes:

```
Your Dockerfile → Docker Image (in Artifact Registry) → Cloud Run Revision → Gets a URL
```

### The Lifecycle of a Request

1. A request arrives at `https://prepsde-backend-242858802974.asia-south1.run.app/health`
2. Cloud Run checks: "Do I have a running container instance?"
   - **If YES** → Route the request to that instance
   - **If NO** → Pull the Docker image, start a new container (this is the **cold start**), then route the request
3. Your FastAPI app inside the container processes the request and returns a response
4. If no more requests come for ~15 minutes, Cloud Run **shuts down the container** (scales to zero)

### What "Scales to Zero" Really Means

With `--min-instances=0`, when nobody is using the app:
- **Zero containers are running**
- **You pay $0** — no CPU, no memory charges
- The trade-off: the first request after idle time triggers a cold start (~2-3 seconds for Python)

This is why it's ideal for a personal tool. You use it in the morning and evening. The rest of the day, it costs nothing.

---

## The Deployment Command Explained

Here's the exact command that deployed your service, broken down:

```powershell
gcloud run deploy prepsde-backend \
    --image=asia-south1-docker.pkg.dev/prepsde-prod/prepsde-repo/backend:latest \
    --region=asia-south1 \
    --service-account=prepsde-backend@prepsde-prod.iam.gserviceaccount.com \
    --min-instances=0 \
    --max-instances=3 \
    --concurrency=80 \
    --timeout=30 \
    --allow-unauthenticated \
    --set-env-vars="..." \
    --set-secrets="GEMINI_API_KEY=GEMINI_API_KEY:latest,..."
```

| Flag | What It Does | Why This Value |
|------|-------------|----------------|
| `--image` | Points to the Docker image in Artifact Registry | Built in Step 5 of deployment |
| `--region=asia-south1` | Deploys to Mumbai datacenter | Lowest latency for Indian users; all free-tier services available |
| `--service-account` | The IAM identity the container runs as | Gives it Firestore access and Secret Manager access, nothing more |
| `--min-instances=0` | Scales to zero when idle | $0 cost when not in use |
| `--max-instances=3` | Never runs more than 3 containers | Cost cap — prevents a billing surprise if you get unexpected traffic |
| `--concurrency=80` | Each container handles up to 80 simultaneous requests | FastAPI is async, so one container can handle many concurrent requests |
| `--timeout=30` | Requests that take >30s are killed | The Gemini API call is the slowest endpoint (~2-3s). 30s is generous. |
| `--allow-unauthenticated` | Anyone on the internet can hit the URL | Auth is enforced inside the app via Firebase JWT verification, not at the Cloud Run level |
| `--set-secrets` | Mounts Secret Manager values as environment variables | The container sees `os.environ["GEMINI_API_KEY"]` without the key ever being in code |

---

## Why `--allow-unauthenticated`?

This is a common point of confusion. There are **two layers of auth**:

1. **Cloud Run level** (IAM): "Can this caller even reach my service?"
2. **Application level** (Firebase JWT): "Is this a logged-in user?"

We use `--allow-unauthenticated` at the Cloud Run level because:
- The mobile app sends requests directly to the Cloud Run URL
- The mobile app user is not a GCP IAM principal — they're a Firebase Auth user
- We enforce authentication inside FastAPI using `Depends(get_current_user)`, which verifies the Firebase ID token

If we required IAM authentication at the Cloud Run level, the mobile app would need a GCP service account key — which defeats the purpose.

**Exception:** The `/health` endpoint has no auth at all. This is intentional — health checks need to work without credentials.

---

## Cloud Run vs The Alternatives

### vs Cloud Functions

| Criterion | Cloud Run | Cloud Functions (2nd gen) |
|-----------|-----------|--------------------------|
| **What you deploy** | A Docker container (any language, any framework) | A single function per endpoint |
| **Routing** | You handle it (FastAPI router) | Each function is a separate deployment with its own URL |
| **Cold start** | ~2-3s (Python) | ~1-1.5s (lighter runtime) |
| **Number of deployments** | 1 container = 1 deployment for 15+ endpoints | 15 separate function deployments |
| **Connection pooling** | You control it (one Firestore client shared across requests) | Each function invocation may create a new connection |
| **Cost at this scale** | $0 (free tier: 2M requests/month) | $0 (free tier: 2M invocations/month) |

**Why Cloud Run wins here:** We have 15+ API endpoints. With Cloud Functions, that's 15 separate deployments to manage, 15 separate logs to monitor, and 15 separate cold start profiles. With Cloud Run, it's one container, one deployment, one log stream.

### vs a VM (Compute Engine)

| Criterion | Cloud Run | Compute Engine VM |
|-----------|-----------|-------------------|
| **Scaling** | Automatic, including to zero | Manual — you pick the VM size, it runs 24/7 |
| **Cost at 30 DAU** | $0 (scales to zero) | ~$5-15/month (smallest VM, always on) |
| **Ops burden** | Zero — no OS patches, no SSH, no disk management | You manage everything: OS updates, disk space, firewall rules, SSL certs |
| **Deployment** | `gcloud run deploy` (one command) | SSH in, pull code, restart process, configure nginx... |

**A VM makes sense when:** You need persistent in-memory state (Redis, WebSocket connections), GPU access, or custom kernel modules. None of which apply here.

### vs AWS Lambda + API Gateway

| Criterion | Cloud Run | AWS Lambda + API Gateway |
|-----------|-----------|-------------------------|
| **Vendor lock-in** | Low — it's just a Docker container. You can run it anywhere. | Medium — Lambda handler signatures are AWS-specific |
| **Integration with Firebase** | Native (same GCP project, workload identity) | Cross-cloud — need to manage Firebase credentials separately |
| **Cold start** | ~2-3s | ~1-3s (depends on runtime + layers) |
| **Pricing model** | Per-request + CPU-seconds | Per-request + duration |

**Why GCP over AWS:** Firebase (Auth + Firestore) is a GCP product. Running the backend on GCP means the service account authenticates automatically via workload identity — no JSON key files, no cross-cloud credentials. If the database were PostgreSQL on AWS RDS, the answer would be different.

---

## Cold Starts: The Real Numbers

A cold start happens when Cloud Run boots a new container instance. Here's the timeline:

```
0ms     → Pull Docker image from Artifact Registry (cached after first pull)
~500ms  → Start the Python process
~1500ms → Uvicorn binds to port 8080
~2000ms → FastAPI loads all routes and middleware
~2500ms → First request is processed
```

**After the container is warm**, requests take ~50-100ms (Firestore read latency dominates).

### When Cold Starts Happen

- First request of the day (after the container scaled to zero overnight)
- After ~15 minutes of no traffic
- When traffic spikes and Cloud Run adds a second instance

### How to Eliminate Cold Starts (If Needed)

Set `--min-instances=1`. This keeps one container always running. Cost: ~$5/month. Worth it if you want instant response times at all hours.

---

## The Dockerfile Explained

```dockerfile
FROM python:3.11-slim                    # Minimal Python image (~150MB)

RUN groupadd -r appuser && \
    useradd -r -g appuser appuser        # Create a non-root user (security)

WORKDIR /app

COPY requirements.txt .                  # Copy deps first (Docker layer caching)
RUN pip install --no-cache-dir \
    -r requirements.txt                  # Install deps (this layer is cached
                                         # unless requirements.txt changes)

COPY . .                                 # Copy application code

RUN chown -R appuser:appuser /app        # Give non-root user ownership
USER appuser                             # Switch to non-root (Cloud Run requirement)

ENV PORT=8080                            # Cloud Run injects PORT, default 8080
EXPOSE $PORT

CMD ["sh", "-c", "uvicorn main:app \
    --host 0.0.0.0 \
    --port ${PORT} \
    --workers 1"]                        # Single worker — Cloud Run scales
                                         # horizontally (more containers),
                                         # not vertically (more workers)
```

**Why `--workers 1`?** Cloud Run's scaling model is: need more capacity → start another container. Having multiple workers inside one container complicates memory management and provides no benefit when the orchestrator handles horizontal scaling.

**Why `python:3.11-slim` instead of `python:3.11`?** The full image is ~900MB. The slim image is ~150MB. Smaller image = faster pull = faster cold start.

---

## Questions You Should Be Able to Answer

1. "What happens when the first request of the day hits your Cloud Run service?" (Cold start sequence)
2. "Why `--allow-unauthenticated` if you have auth?" (Two layers: IAM vs app-level Firebase JWT)
3. "Why Cloud Run over Cloud Functions?" (15+ endpoints in one container vs 15 separate deployments)
4. "Why Cloud Run over a VM?" (Scales to zero, no ops burden, $0 at low traffic)
5. "What's the cold start time and how would you eliminate it?" (~2.5s; set min-instances=1 for ~$5/month)
6. "Why `--workers 1` in Uvicorn?" (Cloud Run scales horizontally with more containers, not vertically with more workers)
7. "Why `asia-south1` as the region?" (Lowest latency for Indian users, free tier available)
8. "How do secrets get into the container?" (Secret Manager → `--set-secrets` flag → available as `os.environ[...]`)
