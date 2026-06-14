import logging
from typing import Optional
from datetime import datetime, timezone
from google.cloud.firestore_v1 import AsyncClient

logger = logging.getLogger(__name__)


async def get_integration(db: AsyncClient, uid: str) -> Optional[dict]:
    try:
        doc = await db.collection("leetcodeIntegrations").document(uid).get()
        if not doc.exists:
            return None
        return doc.to_dict()
    except Exception as e:
        logger.error(f"Error fetching leetcode integration for uid={uid}: {e}")
        raise


async def create_integration(db: AsyncClient, uid: str, data: dict) -> dict:
    try:
        await db.collection("leetcodeIntegrations").document(uid).set(data)
        return data
    except Exception as e:
        logger.error(f"Error creating leetcode integration for uid={uid}: {e}")
        raise


async def update_integration(db: AsyncClient, uid: str, updates: dict) -> None:
    try:
        await db.collection("leetcodeIntegrations").document(uid).update(updates)
    except Exception as e:
        logger.error(f"Error updating leetcode integration for uid={uid}: {e}")
        raise


async def get_baseline(db: AsyncClient, uid: str) -> Optional[dict]:
    try:
        doc = await db.collection("leetcodeBaseline").document(uid).get()
        if not doc.exists:
            return None
        return doc.to_dict()
    except Exception as e:
        logger.error(f"Error fetching leetcode baseline for uid={uid}: {e}")
        raise


async def create_baseline(db: AsyncClient, uid: str, data: dict) -> dict:
    try:
        await db.collection("leetcodeBaseline").document(uid).set(data)
        return data
    except Exception as e:
        logger.error(f"Error creating leetcode baseline for uid={uid}: {e}")
        raise


async def get_verified_solves(
    db: AsyncClient,
    uid: str,
    unlogged_only: bool = False,
    limit: int = 20,
) -> list:
    try:
        query = (
            db.collection("leetcodeVerifiedSolves")
            .document(uid)
            .collection("solves")
        )
        if unlogged_only:
            query = query.where("matchedProblemId", "==", None).where("promptedToLog", "==", False)
        query = query.limit(limit)
        docs = await query.get()
        return [d.to_dict() for d in docs]
    except Exception as e:
        logger.error(f"Error fetching verified solves for uid={uid}: {e}")
        raise


async def upsert_verified_solve(
    db: AsyncClient,
    uid: str,
    title_slug: str,
    data: dict,
) -> None:
    try:
        await (
            db.collection("leetcodeVerifiedSolves")
            .document(uid)
            .collection("solves")
            .document(title_slug)
            .set(data)
        )
    except Exception as e:
        logger.error(f"Error upserting verified solve {title_slug} for uid={uid}: {e}")
        raise


async def disconnect_integration(db: AsyncClient, uid: str) -> None:
    try:
        await db.collection("leetcodeIntegrations").document(uid).update({
            "isActive": False,
        })
    except Exception as e:
        logger.error(f"Error disconnecting leetcode integration for uid={uid}: {e}")
        raise
