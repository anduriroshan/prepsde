# 05 — Authentication & Security

## The Auth Model

PrepSDE uses **Firebase Authentication** for identity and **Firebase ID Tokens (JWTs)** for request authorization. There are no sessions, no cookies, no server-side session storage.

---

## How Firebase Auth Works (The Flow)

```
1. User opens mobile app → taps "Sign in with Google"
2. Firebase Auth SDK handles the OAuth flow with Google
3. Firebase returns a Firebase ID Token (a JWT) to the client
4. Client stores this token in memory
5. For every API call, client sends: Authorization: Bearer <token>
6. Backend receives the token, verifies it, extracts the uid
7. uid is used to scope all data access to that user
```

### What's Inside the Firebase ID Token?

A Firebase ID token is a standard JWT with three parts: `header.payload.signature`

The payload contains:
```json
{
  "iss": "https://securetoken.google.com/prepsde-prod",
  "aud": "prepsde-prod",
  "auth_time": 1718388323,
  "user_id": "abc123xyz",
  "sub": "abc123xyz",
  "iat": 1718388323,
  "exp": 1718391923,
  "email": "roshanandhuri@gmail.com",
  "email_verified": true,
  "firebase": {
    "sign_in_provider": "google.com"
  }
}
```

Key fields:
- `user_id` / `sub`: The unique Firebase UID — this is what we use to scope data
- `exp`: Token expiry — Firebase ID tokens expire after **1 hour**
- `iss`: Issuer — must match your project ID
- `aud`: Audience — must match your project ID

---

## How the Backend Verifies Tokens

The auth middleware in `middleware/auth.py`:

```python
async def get_current_user(credentials) -> str:
    token = credentials.credentials
    decoded = firebase_auth.verify_id_token(token, check_revoked=True)
    return decoded["uid"]
```

### What `verify_id_token` Actually Does

1. **Fetches Google's public keys** (cached after first fetch, refreshed every ~6 hours)
2. **Verifies the JWT signature** using RSA-256 against Google's public key
3. **Checks expiry** (`exp` field) — rejects tokens older than 1 hour
4. **Checks issuer** (`iss`) — must match your Firebase project
5. **Checks audience** (`aud`) — must match your Firebase project
6. **`check_revoked=True`** — makes an additional check to Firebase's revocation list (handles: user deleted their account, admin revoked their tokens, user changed password)

**This is a zero-network-call verification** (except for key refresh and revocation check). The public keys are cached locally. The JWT signature is verified using pure cryptography — no round-trip to Firebase's servers.

---

## Why JWTs Instead of Sessions?

| Criterion | JWT (Firebase ID Token) | Server-Side Sessions |
|-----------|------------------------|---------------------|
| **Server storage** | None — the token contains all needed info | Requires session store (Redis, database) |
| **Cloud Run compatibility** | ✅ Perfect — stateless, works with any instance | ❌ Problematic — Cloud Run instances don't share memory. You'd need an external session store. |
| **Cross-device** | Token is per-device, verified independently | Session tied to one device unless shared via external store |
| **Scalability** | Horizontal scaling is trivial — any instance can verify any token | Need sticky sessions or shared session store |
| **Token expiry** | 1 hour (Firebase default), client refreshes automatically | Configurable, but session fixation is a risk |

**The killer reason:** Cloud Run is stateless. When a container is killed and a new one starts, it has no memory of previous requests. Sessions stored in memory would be lost. You'd need Redis or a database for session storage — adding cost and complexity for something JWTs solve for free.

---

## The Scheduler Auth Pattern

Two endpoints are called by **Cloud Scheduler**, not by users:
- `POST /deadline/nightly` — recalculates deadlines for all users
- `POST /progress/weekly` — generates weekly snapshots

These can't use Firebase Auth (Cloud Scheduler doesn't have a Firebase account). Instead, they use a shared secret:

```python
async def verify_scheduler_token(request: Request) -> None:
    token = request.headers.get("X-Scheduler-Token")
    if not token or token != settings.SCHEDULER_SECRET:
        raise HTTPException(status_code=403, detail="Scheduler token invalid")
```

**How it works:**
1. `SCHEDULER_SECRET` is stored in Secret Manager
2. Cloud Run reads it as an environment variable at boot
3. Cloud Scheduler sends it in the `X-Scheduler-Token` header
4. The middleware compares the header value to the stored secret

**Why not use IAM auth for scheduler calls?** You could — Cloud Scheduler can attach an OIDC token that Cloud Run verifies. But for two endpoints, a shared secret is simpler to set up and debug. At this scale, the security difference is negligible.

---

## Security Layers Summary

```
Layer 1: HTTPS (TLS)
  → All traffic is encrypted. Cloud Run provides TLS automatically.
  → No self-managed certificates.

Layer 2: Cloud Run IAM (--allow-unauthenticated)
  → Allows public access because mobile clients aren't GCP principals.
  → Auth is enforced at the application level instead.

Layer 3: Firebase JWT Verification (application middleware)
  → Every user-facing route requires Depends(get_current_user).
  → Extracts uid from the verified token.
  → Routes that forget this dependency simply can't access user data.

Layer 4: Data Scoping (repository layer)
  → All Firestore queries include userId == uid.
  → Even if somehow a user's uid was wrong, they'd only see their own data.

Layer 5: Firestore Security Rules (defense in depth)
  → Direct client writes are blocked: allow write: if false
  → Direct client reads are scoped to own documents.
  → The backend's service account bypasses these rules.

Layer 6: Secret Manager
  → GEMINI_API_KEY and SCHEDULER_SECRET never appear in code.
  → Mounted as env vars at container boot, accessible only to the service account.
```

---

## Common Attack Vectors & How They're Handled

### 1. "Someone steals a Firebase ID token"
**Mitigation:** Tokens expire in 1 hour. `check_revoked=True` catches tokens from deleted/password-changed accounts.

### 2. "Someone extracts the Firebase config from the client app"
**Mitigation:** The Firebase config (API key, project ID) is *public by design*. It only identifies the project. All it lets an attacker do is create an account — they can't read or write data without a valid token, and writes are blocked at the Firestore rules level.

### 3. "Someone tries to call the Gemini API directly"
**Mitigation:** The Gemini API key is in Secret Manager, not in the client. The only way to trigger a Gemini call is through `POST /ai/coach`, which requires a valid Firebase token AND passes through the pre-screen (rate limiting).

### 4. "Someone calls POST /deadline/nightly without the scheduler secret"
**Mitigation:** Returns 403. The secret is a 24-character random string stored in Secret Manager.

---

## Questions You Should Be Able to Answer

1. "How does authentication work in your system?" (Firebase Auth → JWT → backend verifies signature → extracts uid)
2. "Why JWTs over sessions?" (Cloud Run is stateless; sessions need external storage; JWTs are self-contained)
3. "What does `verify_id_token` actually check?" (Signature, expiry, issuer, audience, revocation)
4. "Is the Firebase config in your client app a security risk?" (No — it's public by design. Auth + rules enforce access control.)
5. "How do you authenticate Cloud Scheduler calls?" (Shared secret in `X-Scheduler-Token` header, stored in Secret Manager)
6. "What happens if someone steals a user's token?" (It expires in 1 hour, and `check_revoked=True` catches account changes)
7. "How many layers of security does a request pass through?" (6: TLS → IAM → JWT → data scoping → Firestore rules → Secret Manager)
