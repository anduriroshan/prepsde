from datetime import date, timedelta
from dataclasses import dataclass
from typing import Literal, Optional

Verdict = Literal["deep_work", "surface", "lazy"]


@dataclass
class DeadlineEngineInput:
    start_date: date
    current_target: date
    today: date
    last_14_verdicts: list  # list[Verdict | None]
    weekly_problems_actual: int
    weekly_problems_target: int


@dataclass
class DeadlineEngineResult:
    days_delta: int
    new_target: date
    reason: str
    days_ahead: int
    days_behind: int
    pace_status: Literal["ahead", "on_track", "behind"]
    recommendation: str


def calculate_deadline_adjustment(inp: DeadlineEngineInput) -> DeadlineEngineResult:
    days_delta = 0

    consecutive_bad_days = 0
    for verdict in reversed(inp.last_14_verdicts):
        if verdict is None or verdict == "lazy":
            consecutive_bad_days += 1
        else:
            break

    if consecutive_bad_days >= 2:
        extension = consecutive_bad_days // 2
        days_delta += extension

    extra_problems = max(0, inp.weekly_problems_actual - inp.weekly_problems_target)
    if extra_problems >= 3:
        shrink = extra_problems // 3
        days_delta -= shrink

    days_delta = min(days_delta, 3)
    days_delta = max(days_delta, -2)

    new_target = inp.current_target + timedelta(days=days_delta)

    if consecutive_bad_days >= 3:
        pace_status = "behind"
        days_behind = consecutive_bad_days
        days_ahead = 0
    elif days_delta < 0:
        pace_status = "ahead"
        days_ahead = abs(days_delta)
        days_behind = 0
    else:
        pace_status = "on_track"
        days_ahead = 0
        days_behind = 0

    reason = _build_reason(consecutive_bad_days, extra_problems, days_delta)
    recommendation = _build_recommendation(pace_status, consecutive_bad_days, inp)

    return DeadlineEngineResult(
        days_delta=days_delta,
        new_target=new_target,
        reason=reason,
        days_ahead=days_ahead,
        days_behind=days_behind,
        pace_status=pace_status,
        recommendation=recommendation,
    )


def _build_reason(consecutive_bad: int, extra_problems: int, delta: int) -> str:
    if delta == 0:
        return "Pace is on track. No adjustment needed."
    if delta > 0:
        return (
            f"You missed {consecutive_bad} consecutive days of focused work. "
            f"Deadline extended by {delta} day{'s' if delta > 1 else ''}."
        )
    return (
        f"You solved {extra_problems} extra problems beyond this week's target. "
        f"Deadline moved up by {abs(delta)} day{'s' if abs(delta) > 1 else ''}."
    )


def _build_recommendation(status: str, consecutive_bad: int, inp: DeadlineEngineInput) -> str:
    if status == "behind":
        return (
            f"You're {consecutive_bad} days behind pace. "
            f"Focus on logging reflections and completing your daily review queue "
            f"to stop the deadline from extending further."
        )
    if status == "ahead":
        return "You're ahead of pace. Maintain consistency and tackle harder patterns."
    return "You're on track. Keep your daily reflection habit and review queue clear."
