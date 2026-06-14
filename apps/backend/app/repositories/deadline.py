import logging
from typing import Optional
from datetime import datetime, timezone
from google.cloud.firestore_v1 import AsyncClient

logger = logging.getLogger(__name__)


async def get_adjustments(db: AsyncClient, uid: str, limit: int = 10) -> list:
    try:
        query = (
            db.collection("deadlineAdjustments")
            .where("userId", "==", uid)
            .order_by("computedAt", direction="DESCENDING")
            .limit(limit)
        )
        docs = await query.get()
        return [d.to_dict() for d in docs]
    except Exception as e:
        logger.error(f"Error fetching adjustments for uid={uid}: {e}")
        raise


async def create_adjustment(db: AsyncClient, adjustment_id: str, data: dict) -> dict:
    try:
        await db.collection("deadlineAdjustments").document(adjustment_id).set(data)
        return data
    except Exception as e:
        logger.error(f"Error creating adjustment id={adjustment_id}: {e}")
        raise


async def get_todays_adjustment(db: AsyncClient, uid: str) -> Optional[dict]:
    try:
        today_start = (
            datetime.now(timezone.utc)
            .replace(hour=0, minute=0, second=0, microsecond=0)
            .isoformat()
        )
        query = (
            db.collection("deadlineAdjustments")
            .where("userId", "==", uid)
            .where("computedAt", ">=", today_start)
            .limit(1)
        )
        docs = await query.get()
        if docs:
            return docs[0].to_dict()
        return None
    except Exception as e:
        logger.error(f"Error fetching today's adjustment for uid={uid}: {e}")
        raise
