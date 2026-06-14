import logging
import httpx
from datetime import datetime, timezone, timedelta
from typing import Optional

logger = logging.getLogger(__name__)


async def fetch_accepted_submissions(username: str, limit: int, timeout: float) -> dict:
    from app.config import settings
    url = f"{settings.LEETCODE_API_BASE_URL}/{username}/acSubmission?limit={limit}"
    async with httpx.AsyncClient(timeout=timeout) as client:
        response = await client.get(url)
        response.raise_for_status()
        return response.json()


async def fetch_progress(username: str, timeout: float = 5.0) -> Optional[dict]:
    from app.config import settings
    url = f"{settings.LEETCODE_API_BASE_URL}/{username}/progress"
    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.get(url)
            response.raise_for_status()
            return response.json()
    except Exception as e:
        logger.warning(f"Progress fetch failed for {username}: {e}")
        return None


def generate_gap_message(lc_verified: int, prepsde_logged: int) -> str:
    gap = lc_verified - prepsde_logged
    if gap > 5:
        return (
            f"LeetCode shows {lc_verified} verified new solves since your plan started, "
            f"but PrepSDE only has {prepsde_logged} logged. "
            f"Consider adding the {gap} missing problems to your tracker."
        )
    elif gap < -5:
        return (
            f"You've logged {prepsde_logged} problems in PrepSDE but LeetCode only "
            f"shows {lc_verified} verified new solves. This is normal if you're "
            f"practicing concepts without submitting on LeetCode."
        )
    else:
        return (
            f"LeetCode shows {lc_verified} verified new solves since your plan started. "
            f"PrepSDE has {prepsde_logged} problems logged. Counts are consistent."
        )
