from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class UserOnboard(BaseModel):
    email: str
    name: str
    targetRole: str  # "SDE1" | "SDE2" | "Senior" | "Staff"
    targetCompany: Optional[str] = None
    startDate: str   # ISO date YYYY-MM-DD
    targetDate: str  # ISO date YYYY-MM-DD
    focusAreas: List[str]


class UserUpdate(BaseModel):
    name: Optional[str] = None
    targetRole: Optional[str] = None
    targetCompany: Optional[str] = None
    targetDate: Optional[str] = None
    focusAreas: Optional[List[str]] = None


class UserResponse(BaseModel):
    uid: str
    email: str
    name: str
    targetRole: str
    targetCompany: Optional[str] = None
    startDate: str
    targetDate: str
    originalDeadline: str
    currentPhase: int
    phaseStartDate: str
    focusAreas: List[str]
    streakCount: int
    longestStreak: int
    lastActiveDate: Optional[str] = None
    totalProblemsLogged: int
    geminiLastCalledAt: Optional[str] = None
    createdAt: str
    updatedAt: str
