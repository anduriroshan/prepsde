import logging
from typing import Optional
from google.cloud.firestore_v1 import AsyncClient

logger = logging.getLogger(__name__)


async def get_latest_snapshot(db: AsyncClient, uid: str) -> Optional[dict]:
    try:
        query = (
            db.collection("weeklySnapshots")
            .where("userId", "==", uid)
            .order_by("weekStartDate", direction="DESCENDING")
            .limit(1)
        )
        docs = await query.get()
        if docs:
            return docs[0].to_dict()
        return None
    except Exception as e:
        logger.error(f"Error fetching latest snapshot for uid={uid}: {e}")
        raise


async def list_snapshots(db: AsyncClient, uid: str, limit: int = 12) -> list:
    try:
        query = (
            db.collection("weeklySnapshots")
            .where("userId", "==", uid)
            .order_by("weekStartDate", direction="DESCENDING")
            .limit(limit)
        )
        docs = await query.get()
        return [d.to_dict() for d in docs]
    except Exception as e:
        logger.error(f"Error listing snapshots for uid={uid}: {e}")
        raise


async def create_snapshot(db: AsyncClient, snapshot_id: str, data: dict) -> dict:
    try:
        await db.collection("weeklySnapshots").document(snapshot_id).set(data)
        return data
    except Exception as e:
        logger.error(f"Error creating snapshot id={snapshot_id}: {e}")
        raise
