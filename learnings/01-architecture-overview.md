# 01 — Architecture Overview

## What Is This System?

PrepSDE is a personal interview preparation tracker. But unlike a simple to-do app, it has three interesting engineering properties:

1. **It started as a pure client-side PWA** (HTML + CSS + JS, all data in localStorage)
2. **It's evolving into a client-server architecture** with a FastAPI backend on Cloud Run
3. **It integrates an LLM (Gemini)** as a core feature, not a bolt-on

Understanding *why* it evolved this way — and what problems each layer solves — is the real architecture story.

---

## The Current Architecture

```
┌─────────────────────┐         ┌──────────────────────────────┐
│   PWA Frontend      │         │   Cloud Run (FastAPI)        │
│   (HTML/CSS/JS)     │ ──────► │                              │
│                     │  HTTPS  │  ┌─────────┐  ┌───────────┐ │
│  localStorage for   │         │  │ Routers │→│ Services  │ │
│  offline data       │         │  └────┬────┘  └─────┬─────┘ │
│                     │         │       │             │        │
│  Service Worker     │         │  ┌────▼────┐  ┌─────▼─────┐ │
│  for caching        │         │  │  Auth   │  │   Repos   │ │
│                     │         │  │Middleware│  │(Firestore)│ │
└─────────────────────┘         │  └─────────┘  └───────────┘ │
                                │       │                      │
                                │  ┌────▼──────────────┐       │
                                │  │ Gemini API (AI     │       │
                                │  │ Studio REST)       │       │
                                │  └───────────────────┘       │
                                └──────────────────────────────┘
                                        │
                                        ▼
                                ┌───────────────┐
                                │   Firestore   │
                                │  (Firebase)   │
                                └───────────────┘
```

## Why Not Just Keep It Client-Side?

The original PWA stores everything in `localStorage`. That works, but has hard limits:

| Problem | Why It Matters |
|---------|---------------|
| **Gemini API key exposed in browser** | Anyone can open DevTools → Application → Local Storage and steal your API key. They can then burn through your Gemini quota. |
| **No cross-device sync** | Your progress on your phone doesn't appear on your laptop. You'd need to manually export/import JSON. |
| **localStorage limit is ~5-10MB** | After 6 months of reflections, problems, and daily task logs, you could hit this ceiling. |
| **No scheduled jobs** | The deadline engine needs to run nightly to recalculate everyone's target dates. A browser can't do cron jobs. |
| **No data safety** | Clear your browser data? Everything is gone. No backups, no recovery. |

**The backend solves all five problems.** The Gemini key lives in Secret Manager (never touches the client). Firestore persists data across devices. Cloud Scheduler runs nightly jobs.

## Why This Specific Stack?

The stack is: **FastAPI (Python) → Cloud Run → Firestore → Gemini API**

Each choice is covered in its own file, but the short version:

- **FastAPI** because the Gemini SDK and Firebase Admin SDK are best in Python
- **Cloud Run** because it scales to zero (costs $0 when nobody's using it) and runs any Docker container
- **Firestore** because Firebase Auth + Firestore are tightly integrated, and the free tier is generous
- **Gemini via AI Studio REST** because it's the simplest path — just an API key, no IAM role setup

## The Layered Backend Architecture

The backend follows a strict 4-layer separation:

```
Router → Service → Repository → Firestore
```

| Layer | Responsibility | What It Does NOT Do |
|-------|---------------|---------------------|
| **Router** | Validate input shape, return response shape | No business logic, no database calls |
| **Service** | All business logic (calculations, decisions) | No Firestore calls, no HTTP |
| **Repository** | All Firestore read/write operations | No business logic |
| **Model** | Define data shapes (Pydantic) | No behavior |

**Why this matters:** When someone asks "where does the streak calculation happen?", you can immediately say "in the service layer — `streak_service.py`. It takes primitives in, returns primitives out, and has zero knowledge of Firestore."

This makes every layer independently testable. You can unit-test the deadline engine with fake dates and fake verdict lists without ever touching a database.

## Key Data Flow: Saving a Reflection

Here's what happens when a user taps "Save Reflection" in the mobile app:

1. **Client** sends `POST /reflections` with `{ accomplished, struggled, tomorrowPlan, rating }` + Firebase ID token in the `Authorization` header
2. **Auth middleware** intercepts the request, decodes the JWT, verifies it against Firebase's public keys, extracts the `uid`
3. **Router** validates the request body against the `ReflectionCreate` Pydantic model
4. **Service** computes the day number, checks if a reflection already exists for today (upsert logic)
5. **Repository** writes the reflection document to Firestore under `reflections/{userId}_{date}`
6. **Client** separately calls `POST /ai/coach` with the same reflection text
7. **AI Coach service** runs the pre-screen (character count + keyword check) — if it fails, returns a hardcoded response without calling Gemini
8. **If pre-screen passes**, checks the daily Gemini quota in Firestore
9. **If quota available**, calls Gemini API, parses the JSON response, returns verdict + micro-lesson
10. **Client** displays the AI feedback card

**Why are `/reflections` and `/ai/coach` separate endpoints?** Because if Gemini is slow (2-3 seconds) or fails entirely, the reflection is already saved. Decoupling persistence from AI evaluation means the user never loses their data because of an API timeout.

---

## Questions You Should Be Able to Answer

1. "Draw the architecture diagram from memory. What calls what?"
2. "Why did you move from a pure PWA to a client-server model? What specific problems did it solve?"
3. "Why is the AI coach a separate endpoint from saving the reflection?"
4. "What does each layer of the backend do, and what is it NOT allowed to do?"
5. "If Firestore goes down, what still works? What breaks?"
6. "If Gemini goes down, what still works?" (Answer: everything except the AI verdict — reflections still save, streak still counts)
