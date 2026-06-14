---
name: project-context
description: PrepSDE platform context — what it is, current state, tech stack decisions, and build targets
metadata:
  type: project
---

PrepSDE is an interview prep platform migrating from a vanilla JS PWA (localStorage-based) to a multi-platform product (React Native/Expo mobile + web), with a FastAPI backend on Cloud Run replacing direct client-side Gemini calls.

**Why:** The existing PWA hardcodes the Gemini API key in localStorage (visible to users). The backend secures all AI calls server-side.

**Tech stack decided:**
- Backend: FastAPI (Python 3.11) on Cloud Run
- Auth: Firebase Auth (Google one-tap), validated server-side via firebase-admin SDK
- Database: Firestore free tier (top-level collections, not subcollections)
- AI: Gemini 2.0 Flash Lite via Google AI Studio REST API (not Vertex AI — simpler setup for MVP)
- Compute: Cloud Run, min=0 (scales to zero), max=3, 512MB memory, asia-south1 (Mumbai)
- Scheduler: Cloud Scheduler → Cloud Run HTTP POST with X-Scheduler-Token secret

**Budget:** ~$1,050 USD in GCP credits. Estimated cost at 100 MAU: ~$4/month. Budget runway: 2+ years at 100 MAU.

**Current phase:** Architecture designed (backend_architecture.md written). No backend code written yet.

**How to apply:** When suggesting infra choices or cost tradeoffs, use these numbers. Don't re-evaluate Firestore vs Postgres or AI Studio vs Vertex AI — decisions are made.
