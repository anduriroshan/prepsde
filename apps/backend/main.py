from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.firebase import initialize_firebase
from app.routers import dashboard, problems, reflections, ai_coach, deadline, progress, integrations, users

initialize_firebase()

app = FastAPI(title="PrepSDE API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(dashboard.router)
app.include_router(problems.router)
app.include_router(reflections.router)
app.include_router(ai_coach.router)
app.include_router(deadline.router)
app.include_router(progress.router)
app.include_router(integrations.router)
app.include_router(users.router)


@app.get("/health")
def health():
    from datetime import datetime, timezone
    return {"status": "ok", "timestamp": datetime.now(timezone.utc).isoformat()}
