# PrepSDE — GCP & Firebase Setup Guide

Everything you need to do, in order, to go from zero to a running backend.
You have ₹90k (~$1,050 USD) in GCP credits. This entire setup costs ~$0/month at your current scale.

---

## Prerequisites (do these first)

- [ ] [Install Google Cloud CLI](https://cloud.google.com/sdk/docs/install) (`gcloud`)
- [ ] [Install Firebase CLI](https://firebase.google.com/docs/cli): `npm install -g firebase-tools`
- [ ] Install Python 3.11: `winget install Python.Python.3.11`
- [ ] Log in to gcloud: `gcloud auth login`
- [ ] Log in to Firebase: `firebase login`

---

## Part 1 — Google Cloud Project

### 1.1 Create the project

Go to [console.cloud.google.com](https://console.cloud.google.com) → "New Project"

| Field | Value |
|---|---|
| Project name | `prepsde-prod` |
| Project ID | `prepsde-prod` (or whatever GCP auto-generates — note it down) |
| Billing account | Link your ₹90k credit account |

Or via CLI:
```bash
gcloud projects create prepsde-prod --name="PrepSDE"
gcloud config set project prepsde-prod
gcloud billing projects link prepsde-prod --billing-account=YOUR_BILLING_ACCOUNT_ID
```

To find your billing account ID: `gcloud billing accounts list`

### 1.2 Enable required APIs

Run this once — enables everything PrepSDE needs:

```bash
gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com \
  secretmanager.googleapis.com \
  cloudscheduler.googleapis.com \
  firestore.googleapis.com \
  firebase.googleapis.com \
  identitytoolkit.googleapis.com
```

---

## Part 2 — Firebase Setup

Firebase lives inside your GCP project. You need it for Auth and Firestore.

### 2.1 Add Firebase to the project

1. Go to [console.firebase.google.com](https://console.firebase.google.com)
2. Click "Add project" → select your existing `prepsde-prod` GCP project
3. Disable Google Analytics (not needed)
4. Click "Continue"

### 2.2 Enable Authentication

1. In Firebase Console → Build → Authentication → Get started
2. Sign-in providers → Enable **Google** (one-tap sign-in)
3. Add your support email (anduri.roshan@accenture.com)
4. Save

### 2.3 Create Firestore database

1. Firebase Console → Build → Firestore Database → Create database
2. Choose **"Start in production mode"** (you'll add security rules next)
3. Location: **`asia-south1`** (Mumbai — lowest latency for Indian users)
4. Click "Done"

### 2.4 Set Firestore security rules

In Firebase Console → Firestore → Rules, replace the default with:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Users can only read/write their own document
    match /users/{uid} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }

    // Problems scoped to owner
    match /problems/{problemId} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.userId;
      allow create: if request.auth != null && request.auth.uid == request.resource.data.userId;
    }

    // Reflections scoped to owner
    match /reflections/{reflectionId} {
      allow read, write: if request.auth != null
        && request.auth.uid == resource.data.userId;
      allow create: if request.auth != null
        && request.auth.uid == request.resource.data.userId;
    }

    // All other collections: backend-only (no direct client access)
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

Publish the rules.

### 2.5 Deploy Firestore indexes

The composite indexes are already defined in `apps/backend/firestore.indexes.json`.

From the monorepo root:
```bash
cd C:\Users\anduri.roshan\Downloads\prepsde
firebase init firestore
# When prompted: use existing project → prepsde-prod
# Firestore rules file: apps/backend/firestore.rules  (or keep default)
# Firestore indexes file: apps/backend/firestore.indexes.json
```

Then deploy:
```bash
firebase deploy --only firestore:indexes
```

---

## Part 3 — Service Account (Backend Credentials)

The FastAPI backend needs a service account key to call Firebase Admin SDK (token verification) and Firestore.

### 3.1 Create the service account

```bash
gcloud iam service-accounts create prepsde-backend \
  --display-name="PrepSDE Backend Service Account"
```

### 3.2 Grant required roles

```bash
# Firestore read/write
gcloud projects add-iam-policy-binding prepsde-prod \
  --member="serviceAccount:prepsde-backend@prepsde-prod.iam.gserviceaccount.com" \
  --role="roles/datastore.user"

# Firebase Auth (token verification)
gcloud projects add-iam-policy-binding prepsde-prod \
  --member="serviceAccount:prepsde-backend@prepsde-prod.iam.gserviceaccount.com" \
  --role="roles/firebase.sdkAdminServiceAgent"

# Secret Manager (read secrets at runtime)
gcloud projects add-iam-policy-binding prepsde-prod \
  --member="serviceAccount:prepsde-backend@prepsde-prod.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

### 3.3 Download the key (for local dev only)

```bash
gcloud iam service-accounts keys create apps/backend/firebase-service-account.json \
  --iam-account=prepsde-backend@prepsde-prod.iam.gserviceaccount.com
```

**IMPORTANT:** Add `firebase-service-account.json` to `.gitignore` immediately:
```bash
echo "apps/backend/firebase-service-account.json" >> .gitignore
```

---

## Part 4 — Gemini API Key

PrepSDE uses Google AI Studio (free tier, not Vertex AI).

1. Go to [aistudio.google.com/apikey](https://aistudio.google.com/apikey)
2. Click "Create API key" → select project `prepsde-prod`
3. Copy the key — you'll need it in Part 5

Free tier limits: 15 requests/minute, 1500 requests/day. More than enough for early users.

---

## Part 5 — Secret Manager (Production Secrets)

Never put secrets in env vars baked into the Docker image. Store them in Secret Manager; Cloud Run reads them at startup.

### 5.1 Create secrets

```bash
# Gemini API key
echo -n "your-gemini-api-key-here" | \
  gcloud secrets create GEMINI_API_KEY --data-file=-

# Scheduler secret (generate a random string)
echo -n "$(openssl rand -hex 32)" | \
  gcloud secrets create SCHEDULER_SECRET --data-file=-
```

To update a secret later:
```bash
echo -n "new-value" | gcloud secrets versions add GEMINI_API_KEY --data-file=-
```

### 5.2 Grant Cloud Run access to secrets

```bash
gcloud secrets add-iam-policy-binding GEMINI_API_KEY \
  --member="serviceAccount:prepsde-backend@prepsde-prod.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

gcloud secrets add-iam-policy-binding SCHEDULER_SECRET \
  --member="serviceAccount:prepsde-backend@prepsde-prod.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

---

## Part 6 — Local Development

### 6.1 Set up Python environment

```bash
cd C:\Users\anduri.roshan\Downloads\prepsde\apps\backend

python -m venv venv
venv\Scripts\activate          # Windows PowerShell

pip install -r requirements.txt
```

### 6.2 Create your local .env

```bash
copy .env.example .env
```

Edit `.env` with real values:
```
GOOGLE_CLOUD_PROJECT=prepsde-prod
GOOGLE_APPLICATION_CREDENTIALS=./firebase-service-account.json
FIRESTORE_DATABASE=(default)
GEMINI_API_KEY=your-actual-key-from-part-4
GEMINI_MODEL=gemini-2.0-flash-lite
SCHEDULER_SECRET=any-local-secret-for-testing
LEETCODE_API_BASE_URL=https://alfa-leetcode-api.onrender.com
ALLOWED_ORIGINS=http://localhost:8081,http://localhost:3000
LOG_LEVEL=INFO
ENVIRONMENT=development
```

### 6.3 Run the server locally

```bash
cd C:\Users\anduri.roshan\Downloads\prepsde\apps\backend
venv\Scripts\activate
uvicorn main:app --reload --port 8000
```

API docs will be at: `http://localhost:8000/docs`
Health check: `http://localhost:8000/health`

---

## Part 7 — Deploy to Cloud Run

### 7.1 Create Artifact Registry repository (one-time)

```bash
gcloud artifacts repositories create prepsde \
  --repository-format=docker \
  --location=asia-south1 \
  --description="PrepSDE backend images"
```

### 7.2 Build and push Docker image

```bash
cd C:\Users\anduri.roshan\Downloads\prepsde\apps\backend

# Configure Docker to use gcloud credentials
gcloud auth configure-docker asia-south1-docker.pkg.dev

# Build and push
gcloud builds submit \
  --tag asia-south1-docker.pkg.dev/prepsde-prod/prepsde/backend:latest
```

### 7.3 Deploy to Cloud Run

```bash
gcloud run deploy prepsde-backend \
  --image asia-south1-docker.pkg.dev/prepsde-prod/prepsde/backend:latest \
  --region asia-south1 \
  --platform managed \
  --service-account prepsde-backend@prepsde-prod.iam.gserviceaccount.com \
  --set-secrets "GEMINI_API_KEY=GEMINI_API_KEY:latest,SCHEDULER_SECRET=SCHEDULER_SECRET:latest" \
  --set-env-vars "GOOGLE_CLOUD_PROJECT=prepsde-prod,FIRESTORE_DATABASE=(default),GEMINI_MODEL=gemini-2.0-flash-lite,LEETCODE_API_BASE_URL=https://alfa-leetcode-api.onrender.com,ENVIRONMENT=production,LOG_LEVEL=INFO" \
  --allow-unauthenticated \
  --min-instances 0 \
  --max-instances 5 \
  --memory 512Mi \
  --cpu 1 \
  --timeout 30
```

Note the deployed URL — it will look like `https://prepsde-backend-xxxxx-el.a.run.app`. Save it.

> **Why `--allow-unauthenticated`?** The mobile app sends Firebase ID tokens, not GCP identity tokens. The backend validates Firebase tokens itself. GCP-level authentication would block the mobile client.

### 7.4 Test the deployment

```bash
curl https://prepsde-backend-xxxxx-el.a.run.app/health
# Expected: {"status": "ok"}
```

---

## Part 8 — Cloud Scheduler (Nightly Jobs)

Two jobs run on a schedule: nightly deadline engine and weekly snapshot generation.

### 8.1 Get your scheduler secret

```bash
gcloud secrets versions access latest --secret=SCHEDULER_SECRET
# Copy the output — you need it below
```

### 8.2 Create the nightly deadline job

Runs at 23:00 IST (17:30 UTC) every day:

```bash
gcloud scheduler jobs create http prepsde-deadline-nightly \
  --location=asia-south1 \
  --schedule="30 17 * * *" \
  --uri="https://prepsde-backend-xxxxx-el.a.run.app/deadline/nightly" \
  --http-method=POST \
  --headers="Content-Type=application/json,X-Scheduler-Token=YOUR_SCHEDULER_SECRET" \
  --message-body="{}" \
  --time-zone="UTC"
```

### 8.3 Create the weekly snapshot job

Runs at 08:00 IST (02:30 UTC) every Sunday:

```bash
gcloud scheduler jobs create http prepsde-weekly-snapshots \
  --location=asia-south1 \
  --schedule="30 2 * * 0" \
  --uri="https://prepsde-backend-xxxxx-el.a.run.app/progress/weekly" \
  --http-method=POST \
  --headers="Content-Type=application/json,X-Scheduler-Token=YOUR_SCHEDULER_SECRET" \
  --message-body="{}" \
  --time-zone="UTC"
```

Replace `YOUR_SCHEDULER_SECRET` with the value from step 8.1.
Replace the URL with your actual Cloud Run URL from Part 7.

---

## Part 9 — Wire the Mobile App to the Backend

In `apps/mobile`, add the backend URL as an env var.

Create `apps/mobile/.env`:
```
EXPO_PUBLIC_API_URL=https://prepsde-backend-xxxxx-el.a.run.app
```

For local dev:
```
EXPO_PUBLIC_API_URL=http://10.0.2.2:8000
```
(`10.0.2.2` is how Android emulator reaches the host machine's localhost.)

---

## Checklist — What's Done vs Still Needed

### Infrastructure (this guide)
- [ ] GCP project created + billing linked
- [ ] APIs enabled
- [ ] Firebase project created (Auth + Firestore)
- [ ] Firestore security rules published
- [ ] Firestore indexes deployed
- [ ] Service account created + roles granted
- [ ] Service account key downloaded (local dev only)
- [ ] Gemini API key created
- [ ] Secrets stored in Secret Manager
- [ ] Docker image built + pushed
- [ ] Cloud Run service deployed
- [ ] Cloud Scheduler jobs created
- [ ] Backend health check passing

### App integration (next step)
- [ ] Mobile app hitting real backend (replace mock `setTimeout` in reflect.tsx with real API calls)
- [ ] Firebase Auth wired in mobile app (Google sign-in flow)
- [ ] Firestore real-time listener on reflection doc (so AI verdict animates in after POST /ai/coach)

---

## Cost Estimate

| Service | Free tier | Expected usage at 10 MAU | Cost |
|---|---|---|---|
| Firestore | 50K reads/day, 20K writes/day, 1GB | ~500 reads/day, ~50 writes/day | **$0** |
| Cloud Run | 2M requests/month, 360K vCPU-sec | ~3K requests/month | **$0** |
| Cloud Scheduler | 3 jobs free | 2 jobs | **$0** |
| Secret Manager | 10K access/month free | ~300/month | **$0** |
| Gemini (AI Studio) | 1500 requests/day free | ~10/day | **$0** |
| Firebase Auth | Unlimited for Google sign-in | 10 users | **$0** |
| **Total** | | | **~$0/month** |

You'll stay on the free tier until roughly 500+ MAU.

---

## Troubleshooting

**Cloud Run returns 500 on startup**
Check logs: `gcloud run services logs read prepsde-backend --region=asia-south1 --limit=50`
Most common cause: secret not found (Secret Manager IAM not set) or Firebase credentials missing.

**Firebase token verification failing locally**
Make sure `GOOGLE_APPLICATION_CREDENTIALS` in `.env` points to the actual path of the service account JSON file. Use an absolute path if relative path isn't working.

**Firestore permission denied**
You published security rules that block backend writes — the backend uses the Admin SDK which bypasses client security rules. If you see this, it means the service account doesn't have the `datastore.user` role (re-run step 3.2).

**Gemini returns 429 (quota exceeded)**
You're on the free tier limit (15 req/min). The pre-screen in the backend prevents most Gemini calls — if you're hitting limits, check that the pre-screen is running correctly. The per-user daily quota (1 call/user/day) should prevent this in normal usage.
