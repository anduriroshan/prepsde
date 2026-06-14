import asyncio
import logging
import time
from datetime import datetime, timezone, date, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from google.cloud.firestore_v1 import AsyncClient
from nanoid import generate

from app.dependencies import get_current_user, get_db, verify_scheduler_token
from app.models.progress import (
    ProgressResponse,
    PhaseProgress,
    Heatmap,
    HeatmapCell,
    TopicMasteryItem,
    WeeklySummary,
)
from app.repositories import users as users_repo
from app.repositories import problems as problems_repo
from app.repositories import reflections as reflections_repo
from app.repositories import snapshots as snapshots_repo

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/progress", tags=["progress"])

VALID_PATTERNS = [
    "arrays", "two-pointers", "sliding-window", "stack", "binary-search",
    "linked-list", "trees", "graphs", "heap", "dp", "backtracking", "tries",
    "greedy", "intervals", "bit-manipulation",
]

PHASE_LABELS = {
    1: "Foundation",
    2: "Patterns",
    3: "Advanced",
}

PHASE_GATE_PROBLEMS = {1: 30, 2: 60, 3: 100}
PHASE_GATE_REFLECTIONS = {1: 14, 2: 30, 3: 60}
WEEKLY_PROBLEMS_TARGET = 10


def _get_week_id(d: date) -> str:
    week_start = d - timedelta(days=d.weekday())
    return week_start.isoformat()


def _get_week_label(week_start: date) -> str:
    week_end = week_start + timedelta(days=6)
    return f"{week_start.strftime('%b %d')} - {week_end.strftime('%b %d')}"


def _verdict_color(avg_verdict: Optional[str]) -> str:
    if avg_verdict == "deep_work":
        return "green"
    elif avg_verdict == "surface":
        return "yellow"
    elif avg_verdict == "lazy":
        return "red"
    return "gray"


def _build_heatmap(
    reflections: list,
    problems: list,
    start_date: date,
    end_date: date,
) -> Heatmap:
    # Build maps by date
    reflection_dates: dict[str, dict] = {r["date"]: r for r in reflections}
    problem_dates: set[str] = set()
    for p in problems:
        created = p.get("createdAt", "")
        if created:
            try:
                d = datetime.fromisoformat(created.replace("Z", "+00:00")).date().isoformat()
                problem_dates.add(d)
            except ValueError:
                pass

    cells = []
    current = start_date
    while current <= end_date:
        date_str = current.isoformat()
        reflection = reflection_dates.get(date_str)
        has_problems = date_str in problem_dates

        if reflection and has_problems and (reflection.get("rating", 0) >= 4):
            intensity = 3
        elif reflection and has_problems:
            intensity = 2
        elif reflection:
            intensity = 1
        else:
            intensity = 0

        cells.append(HeatmapCell(date=date_str, intensity=intensity))
        current += timedelta(days=1)

    return Heatmap(
        startDate=start_date.isoformat(),
        endDate=end_date.isoformat(),
        cells=cells,
    )


def _build_topic_mastery(all_problems: list) -> list[TopicMasteryItem]:
    # Neetcode approximate per-pattern totals (out of 150)
    pattern_totals = {
        "arrays": 13, "two-pointers": 5, "sliding-window": 6, "stack": 7,
        "binary-search": 7, "linked-list": 11, "trees": 15, "graphs": 13,
        "heap": 7, "dp": 23, "backtracking": 9, "tries": 3,
        "greedy": 8, "intervals": 6, "bit-manipulation": 7,
    }

    pattern_solved: dict[str, int] = {}
    pattern_mastered: dict[str, int] = {}

    for p in all_problems:
        pattern = p.get("pattern", "")
        if pattern not in VALID_PATTERNS:
            continue
        pattern_solved[pattern] = pattern_solved.get(pattern, 0) + 1
        if p.get("mastered"):
            pattern_mastered[pattern] = pattern_mastered.get(pattern, 0) + 1

    items = []
    for pattern in VALID_PATTERNS:
        solved = pattern_solved.get(pattern, 0)
        mastered = pattern_mastered.get(pattern, 0)
        total = pattern_totals.get(pattern, 10)
        pct = min(100, int((solved / total) * 100)) if total > 0 else 0
        items.append(TopicMasteryItem(
            pattern=pattern,
            solved=solved,
            mastered=mastered,
            total=total,
            pct=pct,
        ))

    return items


def _build_weekly_summaries_from_snapshots(snapshots: list) -> list[WeeklySummary]:
    summaries = []
    for snap in snapshots:
        week_id = snap.get("weekId", "")
        try:
            week_start = date.fromisoformat(snap.get("weekStartDate", week_id))
        except ValueError:
            week_start = date.today()

        avg_verdict = snap.get("avgVerdict")
        deadline_change_days = snap.get("deadlineChangeDays", 0)
        if deadline_change_days > 0:
            deadline_change = f"+{deadline_change_days}d"
        elif deadline_change_days < 0:
            deadline_change = f"{deadline_change_days}d"
        else:
            deadline_change = "0d"

        summaries.append(WeeklySummary(
            weekId=week_id,
            weekLabel=_get_week_label(week_start),
            problems=snap.get("problemsSolved", 0),
            systemDesign=snap.get("systemDesignTopics", 0),
            reflections=snap.get("reflectionsLogged", 0),
            avgRating=snap.get("avgRating", 0.0),
            avgVerdict=avg_verdict,
            verdictColor=_verdict_color(avg_verdict),
            deadlineChange=deadline_change,
            paceStatus=snap.get("paceStatus", "on_track"),
        ))

    return summaries


@router.get("", response_model=ProgressResponse)
async def get_progress(
    uid: str = Depends(get_current_user),
    db: AsyncClient = Depends(get_db),
):
    try:
        today = datetime.now(timezone.utc).date()
        heatmap_start = today - timedelta(days=84)
        week_start = today - timedelta(days=today.weekday())
        week_start_str = week_start.isoformat()

        # Fetch concurrently
        user_task = users_repo.get_user(db, uid)
        snapshots_task = snapshots_repo.list_snapshots(db, uid, limit=12)
        reflections_task = reflections_repo.get_reflections_since(db, uid, heatmap_start.isoformat())
        problems_task = problems_repo.get_all_problems(db, uid)

        user_data, snapshots, reflections, all_problems = await asyncio.gather(
            user_task, snapshots_task, reflections_task, problems_task
        )

        if not user_data:
            raise HTTPException(status_code=404, detail="User not found")

        current_phase = user_data.get("currentPhase", 1)
        phase_start_str = user_data.get("phaseStartDate", user_data.get("startDate", today.isoformat()))

        # Problems and reflections since phase start
        phase_problems = [
            p for p in all_problems
            if p.get("createdAt", "") >= phase_start_str
        ]
        phase_reflections = [
            r for r in reflections
            if r.get("date", "") >= phase_start_str
        ]

        # Current week problems (for weekCurrent)
        week_problems = [
            p for p in all_problems
            if p.get("createdAt", "") >= week_start_str + "T00:00:00+00:00"
        ]

        problems_required = PHASE_GATE_PROBLEMS.get(current_phase, 30)
        reflections_required = PHASE_GATE_REFLECTIONS.get(current_phase, 14)
        gate_met = (
            len(phase_problems) >= problems_required
            and len(phase_reflections) >= reflections_required
        )

        progress_percent = min(
            100,
            int((len(phase_problems) / problems_required) * 100) if problems_required else 0,
        )

        phase_progress = PhaseProgress(
            current=current_phase,
            label=PHASE_LABELS.get(current_phase, f"Phase {current_phase}"),
            weekCurrent=len(week_problems),
            weekTotal=WEEKLY_PROBLEMS_TARGET,
            progressPercent=progress_percent,
            gateMet=gate_met,
            gateDescription=(
                f"Solve {problems_required} problems and log {reflections_required} reflections "
                f"to complete Phase {current_phase}"
            ),
        )

        heatmap = _build_heatmap(reflections, all_problems, heatmap_start, today)
        topic_mastery = _build_topic_mastery(all_problems)
        weekly_summaries = _build_weekly_summaries_from_snapshots(snapshots)

        return ProgressResponse(
            phase=phase_progress,
            heatmap=heatmap,
            topicMastery=topic_mastery,
            weeklySummaries=weekly_summaries,
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error building progress for uid={uid}: {e}")
        raise HTTPException(status_code=500, detail="Failed to build progress")


@router.post("/weekly", status_code=200)
async def generate_weekly_snapshots(
    db: AsyncClient = Depends(get_db),
    _: None = Depends(verify_scheduler_token),
):
    start_time = time.monotonic()
    snapshots_created = 0
    users_skipped = 0

    try:
        today = datetime.now(timezone.utc).date()
        # Run on Monday: capture the previous week (Mon-Sun)
        week_end = today - timedelta(days=today.weekday() + 1)  # Previous Sunday
        week_start = week_end - timedelta(days=6)
        week_id = week_start.isoformat()
        week_start_str = week_start.isoformat()
        week_end_str = week_end.isoformat()

        # Query active users
        cutoff_str = (today - timedelta(days=7)).isoformat()
        active_users_query = db.collection("users").where("lastActiveDate", ">=", cutoff_str)
        user_docs = await active_users_query.get()

        for user_doc in user_docs:
            user_data = user_doc.to_dict()
            uid = user_data.get("uid")
            if not uid:
                users_skipped += 1
                continue

            try:
                snapshot_id = f"{uid}_{week_id}"
                # Check if snapshot already exists
                existing = await db.collection("weeklySnapshots").document(snapshot_id).get()
                if existing.exists:
                    users_skipped += 1
                    continue

                # Gather week data
                week_problems = await problems_repo.get_problems_created_since(
                    db, uid, week_start_str + "T00:00:00+00:00"
                )
                week_problems_filtered = [
                    p for p in week_problems
                    if p.get("createdAt", "") <= week_end_str + "T23:59:59+00:00"
                ]

                week_reflections = await reflections_repo.get_reflections_in_range(
                    db, uid, week_start_str, week_end_str
                )

                # Compute verdicts
                verdicts = [r.get("aiVerdict") for r in week_reflections if r.get("aiVerdict")]
                verdict_counts = {
                    "deep_work": verdicts.count("deep_work"),
                    "surface": verdicts.count("surface"),
                    "lazy": verdicts.count("lazy"),
                }

                avg_verdict = None
                if verdicts:
                    if verdict_counts["deep_work"] >= len(verdicts) / 2:
                        avg_verdict = "deep_work"
                    elif verdict_counts["lazy"] >= len(verdicts) / 2:
                        avg_verdict = "lazy"
                    else:
                        avg_verdict = "surface"

                ratings = [r.get("rating", 0) for r in week_reflections if r.get("rating")]
                avg_rating = sum(ratings) / len(ratings) if ratings else 0.0

                # Pace status
                problems_count = len(week_problems_filtered)
                if problems_count >= WEEKLY_PROBLEMS_TARGET:
                    pace_status = "ahead"
                elif problems_count >= WEEKLY_PROBLEMS_TARGET * 0.7:
                    pace_status = "on_track"
                else:
                    pace_status = "behind"

                now_iso = datetime.now(timezone.utc).isoformat()
                snapshot_data = {
                    "id": snapshot_id,
                    "userId": uid,
                    "weekId": week_id,
                    "weekStartDate": week_start_str,
                    "weekEndDate": week_end_str,
                    "problemsSolved": problems_count,
                    "systemDesignTopics": 0,
                    "reflectionsLogged": len(week_reflections),
                    "avgRating": round(avg_rating, 2),
                    "verdictCounts": verdict_counts,
                    "avgVerdict": avg_verdict,
                    "deadlineChangeDays": 0,
                    "paceStatus": pace_status,
                    "phaseAtEndOfWeek": user_data.get("currentPhase", 1),
                    "generatedAt": now_iso,
                }

                await snapshots_repo.create_snapshot(db, snapshot_id, snapshot_data)
                snapshots_created += 1

            except Exception as user_error:
                logger.error(f"Error generating weekly snapshot for uid={uid}: {user_error}")
                users_skipped += 1
                continue

        elapsed_ms = int((time.monotonic() - start_time) * 1000)
        return {
            "snapshotsCreated": snapshots_created,
            "usersSkipped": users_skipped,
            "processingTimeMs": elapsed_ms,
        }
    except Exception as e:
        logger.error(f"Error in weekly snapshot generation: {e}")
        raise HTTPException(status_code=500, detail="Weekly snapshot generation failed")
