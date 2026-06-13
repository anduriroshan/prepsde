# Technical Architecture & Spec — PrepSDE

This document details the software design, state schemas, and core algorithmic components of the **PrepSDE** application.

---

## 1. PWA & Frontend Architecture

PrepSDE is built as a highly responsive, modern, dark-themed Single Page Application (SPA) structured as a Progressive Web Application (PWA).

### Technical Stack
*   **Structure**: Single `index.html` file containing views (Dashboard, DSA Tracker, Reflections Journal, Progress Analytics, Settings).
*   **Styling**: Custom CSS (`style.css`) using glassmorphic UI design variables, linear gradient animations, and flex/grid layouts. Completely responsive across mobile viewports (using bottom-tabs nav) and desktop viewports (using a left sidebar nav).
*   **Logic**: Vanilla Javascript (`app.js`) handling UI rendering, dynamic layout updates, local state management, and external service communication.
*   **Service Worker (`sw.js`)**: Implements an offline cache-first strategy. Caches all core assets (`/`, `index.html`, `style.css`, `app.js`, `manifest.json`, and icons). Bypasses caching for external API endpoints (Gemini, EmailJS).

---

## 2. State & Storage Schema

The application logic operates entirely on the client side, maintaining all state inside the browser's `localStorage` namespace under the key `prepsde_state`.

### Database/State Schema
```json
{
  "settings": {
    "name": "Roshan",
    "startDate": "YYYY-MM-DD",
    "endDate": "YYYY-MM-DD",
    "geminiKey": "AIzaSy...",
    "email": "roshananduri@gmail.com",
    "emailjsService": "service_xxxxx",
    "emailjsTemplate": "template_xxxxx",
    "emailjsKey": "your_public_key"
  },
  "problems": [
    {
      "id": 1686667954932,
      "name": "Two Sum",
      "link": "https://leetcode.com/problems/two-sum/",
      "difficulty": "easy",
      "pattern": "arrays",
      "solvedIndependently": "yes",
      "notes": "Used a hash map to look up targets in O(1) time.",
      "dateSolved": "2026-06-13T14:23:22Z",
      "nextReviewDate": "2026-06-16T14:23:22Z",
      "reviewsDone": 0,
      "reviewHistory": []
    }
  ],
  "reflections": [
    {
      "date": "2026-06-13",
      "accomplished": "Solved 2 arrays problems, read CAP theorem.",
      "struggle": "Felt a bit slow starting Two Sum again.",
      "tomorrow": "Complete the Arrays & Hashing section.",
      "rating": 4,
      "aiFeedback": {
        "verdict": "productive",
        "feedback": "Great start Roshan! You completed your core goals...",
        "lessonTitle": "Scale up with Semantic Caches",
        "lessonContent": "When building multi-tenant databases, queries can get expensive...",
        "practiceQuestion": "How would you design a prompt-injection safe system gateway cache?"
      }
    }
  ],
  "completedTasks": {
    "2026-06-13": [
      "Solve NeetCode 150 — Arrays & Hashing (9 problems)",
      "Read System Design Primer: How to approach a system design question"
    ]
  },
  "streak": {
    "current": 1,
    "lastActiveDate": "2026-06-13"
  }
}
```

---

## 3. Spaced Repetition (3-7-15 Rule)

PrepSDE uses a Spaced Repetition System (SRS) algorithm to ensure DSA patterns are committed to long-term memory. 

### Interval Scheduling Rules
When a user logs a problem or completes a review, the next review date is scheduled according to the number of successful reviews completed:

*   **Initial Solve**: Scheduled for review at `T + 3 days` (Review 1 due).
*   **Review 1 Completed**: Scheduled for review at `T + 7 days` (Review 2 due).
*   **Review 2 Completed**: Scheduled for review at `T + 15 days` (Review 3 due).
*   **Review 3 Completed**: Marked as "Mastered".

If the user logs that they could **not** solve a problem independently during a review, the status resets, prompting a review again at `T + 1 day`.

---

## 4. AI Coach Agent (Gemini)

The AI coach utilizes Google's `gemini-2.0-flash-lite` model for real-time analysis of the user's end-of-day reflection journal.

### Prompt Engineering Spec
The agent is prompted via System Instructions to classify reflections and act as a hard-hitting engineering manager:

```
You are the PrepSDE Personal Coach. Your client is Roshan, preparing for SDE2 at Amazon/Google.
Analyze his daily reflection and output a JSON response containing:
1. "verdict": "productive" (user worked hard), "mediocre" (did minimal work), or "lazy" (logged lazy answers like "good", "dsa", "nothing").
2. "feedback": Short, direct critique. If lazy, call him out and motivate him. If productive, congratulate and challenge him.
3. "lessonTitle": (Only if verdict is mediocre/lazy) A highly relevant micro-lesson topic in System Design/AI Engineering.
4. "lessonContent": A short 3-paragraph lesson on that topic.
5. "practiceQuestion": A quick, conceptual interview question based on the lesson.
```

The app handles the HTTP fetch requests directly to `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${API_KEY}`.

---

## 5. EmailJS Task Delivery

To ensure consistency, PrepSDE triggers daily task emails to the user's inbox containing today's syllabus tasks. This operates via **EmailJS** using client-side SDK.

### Event Trigger
When the user clicks "Email Today's Plan" or launches the dashboard, PrepSDE formats the list of dynamic tasks mapped for the current day from the 24-week plan data, compiles it into a markdown list, and triggers the `emailjs.send()` method.
