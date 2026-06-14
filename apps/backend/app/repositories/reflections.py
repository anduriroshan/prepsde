import logging
from typing import Optional
from datetime import datetime, timezone, date, timedelta
from google.cloud.firestore_v1 import AsyncClient

logger = logging.getLogger(__name__)


async def get_reflection(db: AsyncClient, reflection_id: str) -> Optional[dict]:
    try:
        doc = await db.collection("reflections").document(reflection_id).get()
        if not doc.exists:
            return None
        return doc.to_dict()
    except Exception as e:
        logger.error(f"Error fetching reflection id={reflection_id}: {e}")
        raise


async def create_reflection(db: AsyncClient, reflection_id: str, data: dict) -> dict:
    try:
        await db.collection("reflections").document(reflection_id).set(data)
        return data
    except Exception as e:
        logger.error(f"Error creating reflection id={reflection_id}: {e}")
        raise


async def update_reflection(db: AsyncClient, reflection_id: str, updates: dict) -> None:
    try:
        updates["updatedAt"] = datetime.now(timezone.utc).isoformat()
        await db.collection("reflections").document(reflection_id).update(updates)
    except Exception as e:
        logger.error(f"Error updating reflection id={reflection_id}: {e}")
        raise


async def list_reflections(
    db: AsyncClient,
    uid: str,
    limit: int = 30,
    before: Optional[str] = None,
) -> tuple[list, bool]:
    try:
        query = db.collection("reflections").where("userId", "==", uid)
        if before:
            query = query.where("date", "<", before)
        query = query.order_by("date", direction="DESCENDING").limit(limit + 1)
        docs = await query.get()
        results = [d.to_dict() for d in docs]
        has_more = len(results) > limit
        if has_more:
            results = results[:limit]
        return results, has_more
    except Exception as e:
        logger.error(f"Error listing reflections for uid={uid}: {e}")
        raise


async def get_recent_verdicts(db: AsyncClient, uid: str, days: int = 14) -> list:
    try:
        cutoff = (date.today() - timedelta(days=days)).isoformat()
        query = (
            db.collection("reflections")
            .where("userId", "==", uid)
            .where("date", ">=", cutoff)
            .order_by("date", direction="DESCENDING")
        )
        docs = await query.get()
        return [d.to_dict() for d in docs]
    except Exception as e:
        logger.error(f"Error fetching recent verdicts for uid={uid}: {e}")
        raise


async def get_reflections_since(db: AsyncClient, uid: str, since_str: str) -> list:
    try:
        query = (
            db.collection("reflections")
            .where("userId", "==", uid)
            .where("date", ">=", since_str)
            .order_by("date", direction="DESCENDING")
        )
        docs = await query.get()
        return [d.to_dict() for d in docs]
    except Exception as e:
        logger.error(f"Error fetching reflections since {since_str} for uid={uid}: {e}")
        raise


async def get_reflections_in_range(db: AsyncClient, uid: str, start_str: str, end_str: str) -> list:
    try:
        query = (
            db.collection("reflections")
            .where("userId", "==", uid)
            .where("date", ">=", start_str)
            .where("date", "<=", end_str)
        )
        docs = await query.get()
        return [d.to_dict() for d in docs]
    except Exception as e:
        logger.error(f"Error fetching reflections in range for uid={uid}: {e}")
        raise
