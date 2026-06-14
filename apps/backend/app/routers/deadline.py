import asyncio
import logging
import time
from datetime import datetime, timezone, date, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from google.cloud.firestore_v1 import AsyncClient
from nanoid import generate

from app.dependencies import get_current_user, get_db, verify_scheduler_token
from app.models.deadline import (
    DeadlineResponse,
    NightlyResponse,
    AdjustmentRecord,
    PhaseGateStatus,
    PhaseGateRequirements,
)
from app.repositories import users as users_repo
from app.repositories import deadline as deadline_repo
from app.repositories import reflections as reflections_repo
from app.repositories import problems as problems_repo
from app.services.deadline_engine import DeadlineEngineInput, calculate_deadline_adjustment

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/deadline", tags=["deadline"])

# Phase gate requirements
PHASE_GATE_PROBLEMS = {1: 30, 2: 60, 3: 100}
PHASE_GATE_REFLECTIONS = {1: 14, 2: 30, 3: 60}

# Weekly problems target used by the engine
WEEKLY_PROBLEMS_TARGET = 10


def _compute_phase_gate(
    current_phase: int,
    problems_since_phase_start: int,
    reflections_since_phase_start: int,
) -> PhaseGateStatus:
    problems_required = PHASE_GATE_PROBLEMS.get(current_phase, 30)
    reflections_required = PHASE_GATE_REFLECTIONS.get(current_phase, 14)

    gate_met = (
        problems_since_phase_start >= problems_required
        and reflections_since_phase_start >= reflections_required
    )

    blocked_message = None
    if not gate_met:
        missing_parts = []
        if problems_since_phase_start < problems_required:
            missing_parts.append(
                f"{problems_required - problems_since_phase_start} more problems"
            )
        if reflections_since_phase_start < reflections_required:
            missing_parts.append(
                f"{reflections_required - reflections_since_phase_start} more reflections"
            )
        blocked_message = f"Phase {current_phase} gate requires: {' and '.join(missing_parts)}."

    return PhaseGateStatus(
        currentPhase=current_phase,
        gateRequirements=PhaseGateRequirements(
            problemsRequired=problems_required,
            problemsSolved=problems_since_phase_start,
            reflectionsRequired=reflections_required,
            reflectionsLogged=reflections_since_phase_start,
        ),
        gateMet=gate_met,
        blockedMessage=blocked_message,
    )


@router.get("", response_model=DeadlineResponse)
async def get_deadline(
    uid: str = Depends(get_current_user),
    db: AsyncClient = Depends(get_db),
):
    try:
        user_data = await users_repo.get_user(db, uid)
        if not user_data:
            raise HTTPException(status_code=404, detail="User not found")

        today = datetime.now(timezone.utc).date()
        today_str = today.isoformat()
        target_date_str = user_data.get("targetDate", today_str)
        original_deadline = user_data.get("originalDeadline", target_date_str)
        start_date_str = user_data.get("startDate", today_str)
        phase_start_str = user_data.get("phaseStartDate", start_date_str)
        current_phase = user_data.get("currentPhase", 1)

        try:
            target_date = date.fromisoformat(target_date_str)
            original_date = date.fromisoformat(original_deadline)
        except ValueError:
            target_date = today
            original_date = today

        days_left = max(0, (target_date - today).days)
        total_days_delta = (target_date - original_date).days

        # Fetch adjustments, problems since phase start, reflections since phase start concurrently
        adjustments_task = deadline_repo.get_adjustments(db, uid, limit=20)
        problems_task = problems_repo.get_problems_created_since(
            db, uid, phase_start_str + "T00:00:00+00:00"
        )
        reflections_task = reflections_repo.get_reflections_since(db, uid, phase_start_str)

        adjustments, phase_problems, phase_reflections = await asyncio.gather(
            adjustments_task, problems_task, reflections_task
        )

        # Determine pace status from latest adjustment
        pace_status = "on_track"
        if adjustments:
            latest = adjustments[0]
            # Use the deadline engine result's pace_status if stored, else infer
            days_delta = latest.get("daysDelta", 0)
            if days_delta > 0:
                pace_status = "behind"
            elif days_delta < 0:
                pace_status = "ahead"

        phase_gate_status = _compute_phase_gate(
            current_phase=current_phase,
            problems_since_phase_start=len(phase_problems),
            reflections_since_phase_start=len(phase_reflections),
        )

        adjustment_records = [
            AdjustmentRecord(
                id=a.get("id", ""),
                triggeredBy=a.get("triggeredBy", "nightly"),
                daysDelta=a.get("daysDelta", 0),
                previousDeadline=a.get("previousDeadline", ""),
                newDeadline=a.get("newDeadline", ""),
                reason=a.get("reason", ""),
                computedAt=a.get("computedAt", ""),
            )
            for a in adjustments
        ]

        return DeadlineResponse(
            targetDate=target_date_str,
            originalDeadline=original_deadline,
            daysLeft=days_left,
            paceStatus=pace_status,
            totalDaysDelta=total_days_delta,
            adjustmentHistory=adjustment_records,
            phaseGateStatus=phase_gate_status,
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching deadline for uid={uid}: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch deadline")


@router.post("/nightly", response_model=NightlyResponse)
async def nightly_deadline_adjustment(
    db: AsyncClient = Depends(get_db),
    _: None = Depends(verify_scheduler_token),
):
    start_time = time.monotonic()
    users_processed = 0
    adjustments_made = 0
    users_skipped = 0

    try:
        # Query active users (lastActiveDate within last 7 days)
        today = datetime.now(timezone.utc).date()
        cutoff_str = (today - timedelta(days=7)).isoformat()

        active_users_query = (
            db.collection("users")
            .where("lastActiveDate", ">=", cutoff_str)
        )
        user_docs = await active_users_query.get()

        for user_doc in user_docs:
            user_data = user_doc.to_dict()
            uid = user_data.get("uid")
            if not uid:
                users_skipped += 1
                continue

            try:
                # Idempotency check: skip if already adjusted today
                existing_adjustment = await deadline_repo.get_todays_adjustment(db, uid)
                if existing_adjustment:
                    users_skipped += 1
                    continue

                # Gather data needed for the engine
                target_date_str = user_data.get("targetDate")
                start_date_str = user_data.get("startDate")
                if not target_date_str or not start_date_str:
                    users_skipped += 1
                    continue

                target_date = date.fromisoformat(target_date_str)
                start_date = date.fromisoformat(start_date_str)

                # Get last 14 reflections for verdicts
                week_start_14 = (today - timedelta(days=14)).isoformat()
                recent_reflections = await reflections_repo.get_reflections_since(db, uid, week_start_14)
                last_14_verdicts = [r.get("aiVerdict") for r in recent_reflections[:14]]

                # Get this week's problems
                week_start = today - timedelta(days=today.weekday())
                week_start_str = week_start.isoformat() + "T00:00:00+00:00"
                week_problems = await problems_repo.get_problems_created_since(db, uid, week_start_str)
                weekly_problems_actual = len(week_problems)

                engine_input = DeadlineEngineInput(
                    start_date=start_date,
                    current_target=target_date,
                    today=today,
                    last_14_verdicts=last_14_verdicts,
                    weekly_problems_actual=weekly_problems_actual,
                    weekly_problems_target=WEEKLY_PROBLEMS_TARGET,
                )

                result = calculate_deadline_adjustment(engine_input)

                # Write adjustment record
                adjustment_id = generate(size=21)
                now_iso = datetime.now(timezone.utc).isoformat()
                adjustment_data = {
                    "id": adjustment_id,
                    "userId": uid,
                    "triggeredBy": "nightly_scheduler",
                    "daysDelta": result.days_delta,
                    "previousDeadline": target_date_str,
                    "newDeadline": result.new_target.isoformat(),
                    "reason": result.reason,
                    "lazyDaysCount": sum(1 for v in last_14_verdicts if v is None or v == "lazy"),
                    "extraProblemsCount": max(0, weekly_problems_actual - WEEKLY_PROBLEMS_TARGET),
                    "weeklyProblemsActual": weekly_problems_actual,
                    "weeklyProblemsTarget": WEEKLY_PROBLEMS_TARGET,
                    "computedAt": now_iso,
                }

                await deadline_repo.create_adjustment(db, adjustment_id, adjustment_data)

                # Update user's targetDate
                await users_repo.update_user(db, uid, {
                    "targetDate": result.new_target.isoformat(),
                })

                users_processed += 1
                if result.days_delta != 0:
                    adjustments_made += 1

            except Exception as user_error:
                logger.error(f"Error processing nightly adjustment for uid={uid}: {user_error}")
                users_skipped += 1
                continue

        elapsed_ms = int((time.monotonic() - start_time) * 1000)
        return NightlyResponse(
            usersProcessed=users_processed,
            adjustmentsMade=adjustments_made,
            usersSkipped=users_skipped,
            processingTimeMs=elapsed_ms,
        )
    except Exception as e:
        logger.error(f"Error in nightly deadline adjustment: {e}")
        raise HTTPException(status_code=500, detail="Nightly adjustment failed")
