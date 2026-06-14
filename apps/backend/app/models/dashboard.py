from pydantic import BaseModel
from typing import List, Optional


class DueReview(BaseModel):
    id: str
    name: str
    pattern: str
    tag: str


class TodayTask(BaseModel):
    id: str
    label: str
    done: bool
    estimate: str


class WeeklyPace(BaseModel):
    problemsActual: int
    problemsTarget: int
    systemDesignActual: int
    systemDesignTarget: int
    reflectionsActual: int
    reflectionsTarget: int


class NeetcodeProgress(BaseModel):
    solved: int
    total: int


class DashboardResponse(BaseModel):
    daysLeft: int
    targetDate: str
    originalDeadline: str
    paceStatus: str
    pacePercent: int
    streakCount: int
    longestStreak: int
    dueReviewsCount: int
    dueReviews: List[DueReview]
    totalProblemsSolved: int
    neetcodeProgress: NeetcodeProgress
    avgAccuracy: int
    todayTasks: List[TodayTask]
    weeklyPace: WeeklyPace
