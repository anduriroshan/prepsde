import logging
from datetime import date, datetime, timezone, timedelta
from typing import Optional

logger = logging.getLogger(__name__)


async def update_streak(uid: str, db) -> None:
    today = datetime.now(timezone.utc).date()
    today_str = today.isoformat()
    yesterday_str = (today - timedelta(days=1)).isoformat()

    streak_ref = db.collection("streaks").document(uid)
    streak_doc = await streak_ref.get()

    if not streak_doc.exists:
        new_streak = {
            "uid": uid,
            "current": 1,
            "longest": 1,
            "lastActiveDate": today_str,
            "history": {today_str: True},
        }
        await streak_ref.set(new_streak)
        await db.collection("users").document(uid).update({
            "streakCount": 1,
            "longestStreak": 1,
            "lastActiveDate": today_str,
        })
        return

    streak_data = streak_doc.to_dict()
    last_active = streak_data.get("lastActiveDate")
    current = streak_data.get("current", 0)
    longest = streak_data.get("longest", 0)
    history = streak_data.get("history", {})

    if last_active == today_str:
        return  # Already updated today — idempotent

    if last_active == yesterday_str:
        new_current = current + 1
    else:
        new_current = 1

    new_longest = max(longest, new_current)
    history[today_str] = True

    # Prune history older than 90 days
    cutoff = (today - timedelta(days=90)).isoformat()
    history = {k: v for k, v in history.items() if k >= cutoff}

    await streak_ref.update({
        "current": new_current,
        "longest": new_longest,
        "lastActiveDate": today_str,
        "history": history,
    })
    await db.collection("users").document(uid).update({
        "streakCount": new_current,
        "longestStreak": new_longest,
        "lastActiveDate": today_str,
    })
    logger.info(f"Streak updated for uid={uid}: {current} -> {new_current}")
