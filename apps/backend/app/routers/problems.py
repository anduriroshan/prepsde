import logging
from datetime import date, timedelta, datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from google.cloud.firestore_v1 import AsyncClient
from nanoid import generate

from app.dependencies import get_current_user, get_db
from app.models.problems import (
    ProblemCreate,
    ProblemUpdate,
    ReviewRequest,
    ProblemResponse,
    ProblemsListResponse,
)
from app.repositories import problems as problems_repo
from app.repositories import users as users_repo

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/problems", tags=["problems"])

# SRS intervals in days
SRS_INITIAL_DAYS = 3
SRS_REVIEW_1_DAYS = 7
SRS_REVIEW_2_DAYS = 15
SRS_STRUGGLED_DAYS = 3


def _compute_next_review(review_count: int, today: date) -> str:
    if review_count == 0:
        return (today + timedelta(days=SRS_REVIEW_1_DAYS)).isoformat()
    elif review_count == 1:
        return (today + timedelta(days=SRS_REVIEW_2_DAYS)).isoformat()
    else:
        # review_count >= 2 means mastered on next
        return today.isoformat()


@router.post("", response_model=ProblemResponse, status_code=201)
async def create_problem(
    body: ProblemCreate,
    uid: str = Depends(get_current_user),
    db: AsyncClient = Depends(get_db),
):
    try:
        today = date.today()
        now = datetime.now(timezone.utc).isoformat()
        problem_id = generate(size=21)
        next_review = (today + timedelta(days=SRS_INITIAL_DAYS)).isoformat()

        problem_data = {
            "id": problem_id,
            "userId": uid,
            "name": body.name,
            "url": body.url,
            "difficulty": body.difficulty,
            "pattern": body.pattern,
            "solvedIndependently": body.solvedIndependently,
            "notes": body.notes,
            "reviewCount": 0,
            "nextReviewDate": next_review,
            "mastered": False,
            "masteredAt": None,
            "reviewHistory": [],
            "createdAt": now,
            "updatedAt": now,
        }

        await problems_repo.create_problem(db, problem_id, problem_data)
        await users_repo.increment_problems_logged(db, uid)

        return ProblemResponse(**problem_data)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating problem for uid={uid}: {e}")
        raise HTTPException(status_code=500, detail="Failed to create problem")


@router.get("", response_model=ProblemsListResponse)
async def list_problems(
    pattern: Optional[str] = Query(None),
    difficulty: Optional[str] = Query(None),
    status: str = Query("all"),
    limit: int = Query(20, ge=1, le=50),
    cursor: Optional[str] = Query(None),
    uid: str = Depends(get_current_user),
    db: AsyncClient = Depends(get_db),
):
    try:
        results, total = await problems_repo.list_problems(
            db, uid, pattern=pattern, difficulty=difficulty,
            status=status, limit=limit, cursor=cursor
        )
        next_cursor = results[-1]["id"] if len(results) == limit else None
        problems_out = [ProblemResponse(**p) for p in results]
        return ProblemsListResponse(problems=problems_out, nextCursor=next_cursor, total=total)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error listing problems for uid={uid}: {e}")
        raise HTTPException(status_code=500, detail="Failed to list problems")


@router.get("/{problem_id}", response_model=ProblemResponse)
async def get_problem(
    problem_id: str,
    uid: str = Depends(get_current_user),
    db: AsyncClient = Depends(get_db),
):
    try:
        problem = await problems_repo.get_problem(db, problem_id)
        if not problem:
            raise HTTPException(status_code=404, detail="Problem not found")
        if problem["userId"] != uid:
            raise HTTPException(status_code=403, detail="Access denied")
        return ProblemResponse(**problem)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching problem id={problem_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch problem")


@router.put("/{problem_id}", response_model=ProblemResponse)
async def update_problem(
    problem_id: str,
    body: ProblemUpdate,
    uid: str = Depends(get_current_user),
    db: AsyncClient = Depends(get_db),
):
    try:
        problem = await problems_repo.get_problem(db, problem_id)
        if not problem:
            raise HTTPException(status_code=404, detail="Problem not found")
        if problem["userId"] != uid:
            raise HTTPException(status_code=403, detail="Access denied")

        updates = body.model_dump(exclude_none=True)
        if updates:
            await problems_repo.update_problem(db, problem_id, updates)

        updated = await problems_repo.get_problem(db, problem_id)
        return ProblemResponse(**updated)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating problem id={problem_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to update problem")


@router.delete("/{problem_id}", status_code=204)
async def delete_problem(
    problem_id: str,
    uid: str = Depends(get_current_user),
    db: AsyncClient = Depends(get_db),
):
    try:
        problem = await problems_repo.get_problem(db, problem_id)
        if not problem:
            raise HTTPException(status_code=404, detail="Problem not found")
        if problem["userId"] != uid:
            raise HTTPException(status_code=403, detail="Access denied")

        await problems_repo.delete_problem(db, problem_id)
        await users_repo.decrement_problems_logged(db, uid)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting problem id={problem_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete problem")


@router.put("/{problem_id}/review", response_model=ProblemResponse)
async def review_problem(
    problem_id: str,
    body: ReviewRequest,
    uid: str = Depends(get_current_user),
    db: AsyncClient = Depends(get_db),
):
    try:
        problem = await problems_repo.get_problem(db, problem_id)
        if not problem:
            raise HTTPException(status_code=404, detail="Problem not found")
        if problem["userId"] != uid:
            raise HTTPException(status_code=403, detail="Access denied")
        if problem.get("mastered"):
            raise HTTPException(status_code=400, detail="Problem is already mastered")

        today = date.today()
        today_str = today.isoformat()
        now = datetime.now(timezone.utc).isoformat()
        current_review_count = problem.get("reviewCount", 0)
        review_history = problem.get("reviewHistory", [])

        review_history.append({"date": today_str, "struggled": body.struggled})

        if body.struggled:
            new_review_count = 0
            new_next_review = (today + timedelta(days=SRS_STRUGGLED_DAYS)).isoformat()
            mastered = False
            mastered_at = None
        else:
            new_review_count = current_review_count + 1
            if new_review_count >= 3:
                mastered = True
                mastered_at = now
                new_next_review = today_str
            else:
                mastered = False
                mastered_at = None
                new_next_review = _compute_next_review(new_review_count, today)

        updates = {
            "reviewCount": new_review_count,
            "nextReviewDate": new_next_review,
            "mastered": mastered,
            "masteredAt": mastered_at,
            "reviewHistory": review_history,
        }
        await problems_repo.update_problem(db, problem_id, updates)

        updated = await problems_repo.get_problem(db, problem_id)
        return ProblemResponse(**updated)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error reviewing problem id={problem_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to review problem")
