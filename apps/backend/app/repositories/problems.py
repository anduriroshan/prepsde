import logging
from typing import Optional
from datetime import datetime, timezone, date
from google.cloud.firestore_v1 import AsyncClient

logger = logging.getLogger(__name__)


async def get_problem(db: AsyncClient, problem_id: str) -> Optional[dict]:
    try:
        doc = await db.collection("problems").document(problem_id).get()
        if not doc.exists:
            return None
        return doc.to_dict()
    except Exception as e:
        logger.error(f"Error fetching problem id={problem_id}: {e}")
        raise


async def create_problem(db: AsyncClient, problem_id: str, data: dict) -> dict:
    try:
        await db.collection("problems").document(problem_id).set(data)
        return data
    except Exception as e:
        logger.error(f"Error creating problem id={problem_id}: {e}")
        raise


async def update_problem(db: AsyncClient, problem_id: str, updates: dict) -> None:
    try:
        updates["updatedAt"] = datetime.now(timezone.utc).isoformat()
        await db.collection("problems").document(problem_id).update(updates)
    except Exception as e:
        logger.error(f"Error updating problem id={problem_id}: {e}")
        raise


async def delete_problem(db: AsyncClient, problem_id: str) -> None:
    try:
        await db.collection("problems").document(problem_id).delete()
    except Exception as e:
        logger.error(f"Error deleting problem id={problem_id}: {e}")
        raise


async def list_problems(
    db: AsyncClient,
    uid: str,
    pattern: Optional[str] = None,
    difficulty: Optional[str] = None,
    status: str = "all",
    limit: int = 20,
    cursor: Optional[str] = None,
) -> tuple[list, int]:
    try:
        today = date.today().isoformat()

        query = db.collection("problems").where("userId", "==", uid)
        if pattern:
            query = query.where("pattern", "==", pattern)
        if difficulty:
            query = query.where("difficulty", "==", difficulty)
        if status == "due":
            query = query.where("nextReviewDate", "<=", today).where("mastered", "==", False)
        elif status == "mastered":
            query = query.where("mastered", "==", True)

        query = query.order_by("createdAt", direction="DESCENDING").limit(limit + 1)

        if cursor:
            cursor_doc = await db.collection("problems").document(cursor).get()
            if cursor_doc.exists:
                query = query.start_after(cursor_doc)

        docs = await query.get()
        results = [d.to_dict() for d in docs]
        has_more = len(results) > limit
        if has_more:
            results = results[:limit]

        count_query = db.collection("problems").where("userId", "==", uid)
        count_docs = await count_query.get()
        total = len(count_docs)

        return results, total
    except Exception as e:
        logger.error(f"Error listing problems for uid={uid}: {e}")
        raise


async def get_due_problems(db: AsyncClient, uid: str, today_str: str) -> list:
    try:
        query = (
            db.collection("problems")
            .where("userId", "==", uid)
            .where("nextReviewDate", "<=", today_str)
            .where("mastered", "==", False)
        )
        docs = await query.get()
        return [d.to_dict() for d in docs]
    except Exception as e:
        logger.error(f"Error fetching due problems for uid={uid}: {e}")
        raise


async def get_problems_created_since(db: AsyncClient, uid: str, since_str: str) -> list:
    try:
        query = (
            db.collection("problems")
            .where("userId", "==", uid)
            .where("createdAt", ">=", since_str)
        )
        docs = await query.get()
        return [d.to_dict() for d in docs]
    except Exception as e:
        logger.error(f"Error fetching problems since {since_str} for uid={uid}: {e}")
        raise


async def get_all_problems(db: AsyncClient, uid: str) -> list:
    try:
        query = db.collection("problems").where("userId", "==", uid)
        docs = await query.get()
        return [d.to_dict() for d in docs]
    except Exception as e:
        logger.error(f"Error fetching all problems for uid={uid}: {e}")
        raise
