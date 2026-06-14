import logging
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from google.cloud.firestore_v1 import AsyncClient

from app.dependencies import get_current_user, get_db
from app.models.reflections import ReflectionCreate, ReflectionResponse, ReflectionsListResponse
from app.repositories import reflections as reflections_repo
from app.services.streak import update_streak

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/reflections", tags=["reflections"])


@router.post("", response_model=ReflectionResponse, status_code=201)
async def create_reflection(
    body: ReflectionCreate,
    background_tasks: BackgroundTasks,
    uid: str = Depends(get_current_user),
    db: AsyncClient = Depends(get_db),
):
    try:
        today_str = datetime.now(timezone.utc).date().isoformat()
        reflection_id = f"{uid}_{today_str}"

        existing = await reflections_repo.get_reflection(db, reflection_id)
        if existing:
            raise HTTPException(status_code=409, detail="Reflection already submitted for today")

        now = datetime.now(timezone.utc).isoformat()
        reflection_data = {
            "id": reflection_id,
            "userId": uid,
            "date": today_str,
            "rating": body.rating,
            "content": body.content,
            "aiVerdict": None,
            "aiMessage": None,
            "microLesson": None,
            "prescreenResult": None,
            "geminiCalled": False,
            "submittedAt": now,
            "updatedAt": now,
        }

        await reflections_repo.create_reflection(db, reflection_id, reflection_data)

        # Update streak in background to not block the response
        background_tasks.add_task(update_streak, uid, db)

        return ReflectionResponse(**reflection_data)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating reflection for uid={uid}: {e}")
        raise HTTPException(status_code=500, detail="Failed to create reflection")


@router.get("", response_model=ReflectionsListResponse)
async def list_reflections(
    limit: int = Query(30, ge=1, le=50),
    before: Optional[str] = Query(None),
    uid: str = Depends(get_current_user),
    db: AsyncClient = Depends(get_db),
):
    try:
        results, has_more = await reflections_repo.list_reflections(
            db, uid, limit=limit, before=before
        )
        next_cursor = results[-1]["date"] if has_more else None
        reflections_out = [ReflectionResponse(**r) for r in results]
        return ReflectionsListResponse(
            reflections=reflections_out,
            nextCursor=next_cursor,
            hasMore=has_more,
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error listing reflections for uid={uid}: {e}")
        raise HTTPException(status_code=500, detail="Failed to list reflections")


@router.get("/{reflection_date}", response_model=ReflectionResponse)
async def get_reflection_by_date(
    reflection_date: str,
    uid: str = Depends(get_current_user),
    db: AsyncClient = Depends(get_db),
):
    try:
        reflection_id = f"{uid}_{reflection_date}"
        reflection = await reflections_repo.get_reflection(db, reflection_id)
        if not reflection:
            raise HTTPException(status_code=404, detail="Reflection not found")
        if reflection["userId"] != uid:
            raise HTTPException(status_code=403, detail="Access denied")
        return ReflectionResponse(**reflection)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching reflection for uid={uid} date={reflection_date}: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch reflection")
