import asyncio
import logging
from datetime import datetime, timezone, timedelta, date
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from google.cloud.firestore_v1 import AsyncClient

from app.dependencies import get_current_user, get_db
from app.models.dashboard import (
    DashboardResponse,
    DueReview,
    TodayTask,
    WeeklyPace,
    NeetcodeProgress,
)
from app.repositories import problems as problems_repo
from app.repositories import reflections as reflections_repo
from app.repositories import snapshots as snapshots_repo
from app.repositories import users as users_repo
from app.services.streak import update_streak

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/dashboard", tags=["dashboard"])

# Neetcode 150 total
NEETCODE_TOTAL = 150

# Weekly targets
WEEKLY_PROBLEMS_TARGET = 10
WEEKLY_SYSTEM_DESIGN_TARGET = 2
WEEKLY_REFLECTIONS_TARGET = 7


def _get_week_start(today: date) -> date:
    return today - timedelta(days=today.weekday())


def _build_due_review_tag(problem: dict) -> str:
    review_count = problem.get("reviewCount", 0)
    if review_count == 0:
        return "First Review"
    elif review_count == 1:
        return "Review 2"
    elif review_count == 2:
        return "Review 3"
    return "Review"


def _build_today_tasks(
    due_reviews: list,
    reflections_this_week: list,
    today_str: str,
) -> list[TodayTask]:
    tasks = []

    # Reflection task
    has_reflection_today = any(r.get("date") == today_str for r in reflections_this_week)
    tasks.append(TodayTask(
        id="reflection",
        label="Write today's reflection",
        done=has_reflection_today,
        estimate="5 min",
    ))

    # Review queue task
    tasks.append(TodayTask(
        id="reviews",
        label=f"Clear review queue ({len(due_reviews)} due)",
        done=len(due_reviews) == 0,
        estimate=f"{len(due_reviews) * 15} min" if due_reviews else "0 min",
    ))

    # Solve new problem task
    tasks.append(TodayTask(
        id="new_problem",
        label="Solve 1 new problem",
        done=False,
        estimate="45 min",
    ))

    return tasks


@router.get("", response_model=DashboardResponse)
async def get_dashboard(
    background_tasks: BackgroundTasks,
    uid: str = Depends(get_current_user),
    db: AsyncClient = Depends(get_db),
):
    try:
        today = datetime.now(timezone.utc).date()
        today_str = today.isoformat()
        week_start = _get_week_start(today)
        week_start_str = week_start.isoformat()

        # Run 6 Firestore reads concurrently where possible
        user_task = users_repo.get_user(db, uid)
        streak_task = db.collection("streaks").document(uid).get()
        due_problems_task = problems_repo.get_due_problems(db, uid, today_str)
        week_problems_task = problems_repo.get_problems_created_since(db, uid, week_start_str + "T00:00:00+00:00")
        week_reflections_task = reflections_repo.get_reflections_since(db, uid, week_start_str)
        snapshot_task = snapshots_repo.get_latest_snapshot(db, uid)

        (
            user_data,
            streak_doc,
            due_problems,
            week_problems,
            week_reflections,
            latest_snapshot,
        ) = await asyncio.gather(
            user_task,
            streak_task,
            due_problems_task,
            week_problems_task,
            week_reflections_task,
            snapshot_task,
        )

        if not user_data:
            raise HTTPException(status_code=404, detail="User not found")

        # Compute days left
        target_date_str = user_data.get("targetDate", today_str)
        try:
            target_date = date.fromisoformat(target_date_str)
        except ValueError:
            target_date = today
        days_left = max(0, (target_date - today).days)

        # Streak data
        streak_data = streak_doc.to_dict() if streak_doc.exists else {}
        streak_count = streak_data.get("current", 0)
        longest_streak = streak_data.get("longest", 0)
        last_active = streak_data.get("lastActiveDate")

        # Check if streak needs reset (last active not today or yesterday)
        yesterday_str = (today - timedelta(days=1)).isoformat()
        if last_active and last_active not in (today_str, yesterday_str):
            background_tasks.add_task(_reset_streak_if_broken, uid, db)

        # Due reviews
        due_reviews_out = [
            DueReview(
                id=p["id"],
                name=p["name"],
                pattern=p.get("pattern", ""),
                tag=_build_due_review_tag(p),
            )
            for p in due_problems
        ]

        # Weekly pace
        weekly_problems_actual = len(week_problems)
        weekly_reflections_actual = len(week_reflections)

        # Pace percent: based on problems solved vs target
        pace_percent = min(100, int((weekly_problems_actual / WEEKLY_PROBLEMS_TARGET) * 100))

        # Determine pace status
        if latest_snapshot:
            pace_status = latest_snapshot.get("paceStatus", "on_track")
        else:
            if weekly_problems_actual >= WEEKLY_PROBLEMS_TARGET:
                pace_status = "ahead"
            elif weekly_problems_actual >= WEEKLY_PROBLEMS_TARGET * 0.7:
                pace_status = "on_track"
            else:
                pace_status = "behind"

        # Total problems solved
        total_problems = user_data.get("totalProblemsLogged", 0)

        # NeetCode progress (based on total logged vs 150)
        neetcode_progress = NeetcodeProgress(
            solved=min(total_problems, NEETCODE_TOTAL),
            total=NEETCODE_TOTAL,
        )

        # Average accuracy (percentage of problems solved independently or partially)
        all_problems_list = week_problems
        if all_problems_list:
            good_solves = sum(
                1 for p in all_problems_list
                if p.get("solvedIndependently") in ("yes", "partially")
            )
            avg_accuracy = int((good_solves / len(all_problems_list)) * 100)
        else:
            avg_accuracy = 0

        # Today tasks
        today_tasks = _build_today_tasks(due_problems, week_reflections, today_str)

        # Weekly pace model
        weekly_pace = WeeklyPace(
            problemsActual=weekly_problems_actual,
            problemsTarget=WEEKLY_PROBLEMS_TARGET,
            systemDesignActual=0,
            systemDesignTarget=WEEKLY_SYSTEM_DESIGN_TARGET,
            reflectionsActual=weekly_reflections_actual,
            reflectionsTarget=WEEKLY_REFLECTIONS_TARGET,
        )

        original_deadline = user_data.get("originalDeadline", target_date_str)

        return DashboardResponse(
            daysLeft=days_left,
            targetDate=target_date_str,
            originalDeadline=original_deadline,
            paceStatus=pace_status,
            pacePercent=pace_percent,
            streakCount=streak_count,
            longestStreak=longest_streak,
            dueReviewsCount=len(due_reviews_out),
            dueReviews=due_reviews_out,
            totalProblemsSolved=total_problems,
            neetcodeProgress=neetcode_progress,
            avgAccuracy=avg_accuracy,
            todayTasks=today_tasks,
            weeklyPace=weekly_pace,
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error building dashboard for uid={uid}: {e}")
        raise HTTPException(status_code=500, detail="Failed to build dashboard")


async def _reset_streak_if_broken(uid: str, db: AsyncClient) -> None:
    try:
        streak_ref = db.collection("streaks").document(uid)
        today_str = datetime.now(timezone.utc).date().isoformat()
        yesterday_str = (datetime.now(timezone.utc).date() - timedelta(days=1)).isoformat()

        streak_doc = await streak_ref.get()
        if not streak_doc.exists:
            return

        streak_data = streak_doc.to_dict()
        last_active = streak_data.get("lastActiveDate")

        if last_active and last_active not in (today_str, yesterday_str):
            await streak_ref.update({"current": 0})
            await db.collection("users").document(uid).update({"streakCount": 0})
            logger.info(f"Streak reset for uid={uid} (last active: {last_active})")
    except Exception as e:
        logger.error(f"Error resetting streak for uid={uid}: {e}")
