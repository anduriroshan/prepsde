# 08 — PWA Frontend Architecture

## What Is a PWA?

A Progressive Web App is a website that behaves like a native app. The PrepSDE frontend is a single HTML file + CSS + JS that can:

- Be **installed** on your phone's home screen (looks like a native app)
- Work **offline** (service worker caches assets)
- Send **push notifications** (with permission)
- Store data **locally** (localStorage)

---

## Why a PWA Instead of React/Next.js?

| Criterion | Vanilla HTML/CSS/JS (current) | React/Next.js |
|-----------|------------------------------|---------------|
| **Bundle size** | ~90KB total (HTML + CSS + JS) | ~200-500KB minimum (React runtime + framework) |
| **Build step** | None — edit and refresh | `npm run build`, webpack/turbo, dev server |
| **Offline** | Works with a simple service worker | Needs additional configuration |
| **Learning curve** | Zero dependencies to understand | React concepts (hooks, state, JSX, virtual DOM) |
| **When it breaks** | View source → find the bug | Stack trace through 5 layers of abstractions |

**The current PWA is intentionally simple.** It's one HTML file, one CSS file, one JS file. No transpilation, no bundling, no npm in the frontend.

### When You'd Switch to React/Next.js

- When you add **complex interactive features** (drag-and-drop, real-time collaboration)
- When you need **component reuse across many pages** (the current app has 5 views, which is manageable without components)
- When you add a **mobile app** that shares logic with the web (React Native)

The `apps/web` directory already has a Next.js scaffold for when this transition happens.

---

## How the Service Worker Works

File: `sw.js`

A service worker is a JavaScript file that runs **in the background**, separate from the web page. It intercepts network requests and can serve cached responses.

### The Caching Strategy: Stale-While-Revalidate

```javascript
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request).then(cached => {
            const fetchPromise = fetch(event.request).then(response => {
                // Update cache with fresh version
                if (response.ok) {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then(cache => 
                        cache.put(event.request, clone)
                    );
                }
                return response;
            }).catch(() => cached); // If network fails, use cache
            
            return cached || fetchPromise;  // Serve cached first, then update
        })
    );
});
```

**How it works:**

1. Request comes in (e.g., `GET /style.css`)
2. Check the cache — if found, **serve it immediately** (fast!)
3. Simultaneously fetch from the network
4. If network responds, **update the cache** with the fresh version
5. Next time, the user gets the updated version from cache

**Why this strategy?**

- **Cache-first** means the app loads instantly, even on slow networks
- **Background update** means the user gets fresh content on the next visit
- **Network fallback** means the app works completely offline

### What Gets Cached

```javascript
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/style.css',
    '/app.js',
    '/manifest.json',
    '/icon-192.png',
    '/icon-512.png'
];
```

### What Doesn't Get Cached

```javascript
if (event.request.method !== 'GET' ||
    event.request.url.includes('generativelanguage.googleapis.com') ||
    event.request.url.includes('emailjs.com')) {
    return;  // Don't cache API calls
}
```

API calls (Gemini, EmailJS) bypass the service worker entirely. You don't want a cached AI response — each should be fresh.

---

## localStorage as the Client-Side Database

All data is stored in `localStorage` with JSON serialization:

```javascript
const STATE_KEYS = {
    SETTINGS: 'sde2_settings',
    PROBLEMS: 'sde2_problems',
    REFLECTIONS: 'sde2_reflections',
    DAILY_TASKS: 'sde2_daily_tasks',
    EMAIL_CONFIG: 'sde2_email_config',
    AI_CONFIG: 'sde2_ai_config'
};

function loadState(key, fallback = null) {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : fallback;
}

function saveState(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
}
```

### localStorage Limitations

| Limitation | Impact |
|-----------|--------|
| **5-10MB per origin** | After ~6 months of heavy use, you could approach this limit with daily task logs |
| **Synchronous API** | `getItem` blocks the main thread. For small data it's fine; for large datasets it causes jank |
| **No querying** | To find "all problems with pattern=dp", you load ALL problems and filter in JS |
| **No cross-device sync** | Your phone and laptop have separate localStorage |
| **Cleared on browser data wipe** | One accidental "Clear browsing data" deletes everything |

**This is exactly why the backend + Firestore was introduced.** The PWA's localStorage is now a **local cache** — the source of truth moves to Firestore.

### localStorage vs IndexedDB

IndexedDB would solve the size limit and synchronous API problems, but:
- More complex API (transactions, cursors, versioning)
- For this data volume (~1MB), localStorage is sufficient
- The data is migrating to Firestore anyway

---

## The Navigation System

The app uses a **single-page architecture** without a router library:

```javascript
function switchView(viewId) {
    // Hide all views
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    
    // Show the selected view
    document.getElementById(`view-${viewId}`).classList.add('active');
    
    // Update nav buttons (desktop + mobile)
    document.querySelectorAll(`[data-view="${viewId}"]`)
        .forEach(b => b.classList.add('active'));
    
    // Render view-specific content
    if (viewId === 'dashboard') renderDashboard();
    if (viewId === 'dsa') renderDSATracker();
    // ...
}
```

**All 5 views exist in the HTML at all times.** Switching views just toggles `display: none` ↔ `display: block`. This means:
- No page reloads
- No network requests on navigation
- View state is preserved (scroll position, form inputs)
- But: all views are in the DOM, which could be a problem for very complex UIs

---

## The Styling Philosophy

### Dark Theme with Glassmorphism

```css
:root {
    --bg-primary: #06060a;           /* Near-black background */
    --bg-card: rgba(255, 255, 255, 0.025); /* Slightly transparent cards */
    --border-color: rgba(255, 255, 255, 0.06);
    --gradient-primary: linear-gradient(135deg, #6366f1, #8b5cf6, #a855f7);
}

.section-card {
    backdrop-filter: blur(10px);      /* Glass effect */
}
```

**Why dark theme?** This is a dev tool. Developers prefer dark mode. Also, dark themes use less battery on OLED screens (relevant for mobile PWA use).

### Responsive Design — Desktop + Mobile

- **Desktop (>768px):** Fixed sidebar navigation + main content area
- **Mobile (<768px):** Sidebar hidden, bottom tab navigation appears
- **Extra small (<380px):** Tighter padding, smaller stat values

```css
@media (max-width: 768px) {
    .sidebar { display: none; }
    .mobile-nav { display: flex; }
    .main-content { margin-left: 0; padding-bottom: 90px; }
}
```

### iOS-Specific Fixes

```css
.reflection-question textarea {
    font-size: 16px; /* Prevents iOS auto-zoom on focus */
}
```

iOS Safari auto-zooms on input focus when font-size is below 16px. This CSS prevents that.

---

## Questions You Should Be Able to Answer

1. "What is a PWA and how does it differ from a native app?" (Web tech + service worker + manifest = installable, offline-capable)
2. "How does the service worker caching strategy work?" (Stale-while-revalidate: serve cached, update in background)
3. "Why does the service worker skip API calls?" (Gemini/EmailJS responses should never be cached — they need to be fresh)
4. "What are the limitations of localStorage?" (5-10MB limit, sync API, no querying, no cross-device, cleared on browser wipe)
5. "Why vanilla HTML/CSS/JS instead of React?" (90KB bundle, no build step, sufficient for 5 views)
6. "How does view navigation work without a router?" (All views in DOM, toggle `display` with class, re-render on switch)
7. "What's glassmorphism?" (Semi-transparent backgrounds with `backdrop-filter: blur()` creating a frosted glass effect)
