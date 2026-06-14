import logging
from typing import Optional
from datetime import datetime, timezone
from google.cloud.firestore_v1 import AsyncClient

logger = logging.getLogger(__name__)


async def get_user(db: AsyncClient, uid: str) -> Optional[dict]:
    try:
        doc = await db.collection("users").document(uid).get()
        if not doc.exists:
            return None
        return doc.to_dict()
    except Exception as e:
        logger.error(f"Error fetching user uid={uid}: {e}")
        raise


async def create_user(db: AsyncClient, uid: str, data: dict) -> dict:
    try:
        now = datetime.now(timezone.utc).isoformat()
        user_data = {
            **data,
            "uid": uid,
            "createdAt": now,
            "updatedAt": now,
            "streakCount": 0,
            "longestStreak": 0,
            "totalProblemsLogged": 0,
            "geminiLastCalledAt": None,
            "lastActiveDate": None,
            "currentPhase": 1,
            "phaseStartDate": data.get("startDate"),
        }
        await db.collection("users").document(uid).set(user_data)
        return user_data
    except Exception as e:
        logger.error(f"Error creating user uid={uid}: {e}")
        raise


async def update_user(db: AsyncClient, uid: str, updates: dict) -> None:
    try:
        updates["updatedAt"] = datetime.now(timezone.utc).isoformat()
        await db.collection("users").document(uid).update(updates)
    except Exception as e:
        logger.error(f"Error updating user uid={uid}: {e}")
        raise


async def increment_problems_logged(db: AsyncClient, uid: str) -> None:
    try:
        from google.cloud.firestore_v1 import transforms
        await db.collection("users").document(uid).update({
            "totalProblemsLogged": transforms.INCREMENT(1),
            "updatedAt": datetime.now(timezone.utc).isoformat(),
        })
    except Exception as e:
        logger.error(f"Error incrementing problems logged for uid={uid}: {e}")
        raise


async def decrement_problems_logged(db: AsyncClient, uid: str) -> None:
    try:
        from google.cloud.firestore_v1 import transforms
        await db.collection("users").document(uid).update({
            "totalProblemsLogged": transforms.INCREMENT(-1),
            "updatedAt": datetime.now(timezone.utc).isoformat(),
        })
    except Exception as e:
        logger.error(f"Error decrementing problems logged for uid={uid}: {e}")
        raise
