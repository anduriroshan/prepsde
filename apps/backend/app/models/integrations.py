from pydantic import BaseModel, field_validator
from typing import Optional, List
import re


class LeetCodeConnectRequest(BaseModel):
    leetcodeUsername: str

    @field_validator("leetcodeUsername")
    @classmethod
    def validate_username(cls, v):
        v = v.lower().strip()
        if len(v) < 3 or len(v) > 25:
            raise ValueError("Username must be 3-25 characters")
        if not re.match(r"^[a-z0-9_-]+$", v):
            raise ValueError("Username must be alphanumeric with hyphens/underscores only")
        return v


class LeetCodeConnectResponse(BaseModel):
    leetcodeUsername: str
    connectedAt: str
    baselineSlugCount: int
    message: str


class VerifiedByDifficulty(BaseModel):
    easy: int
    medium: int
    hard: int


class NewSolveItem(BaseModel):
    titleSlug: str
    title: str
    solvedAt: str
    lang: str
    alreadyInLog: bool


class SyncResponse(BaseModel):
    lastSyncAt: str
    lastSyncStatus: str
    verifiedSolvesCount: int
    verifiedByDifficulty: VerifiedByDifficulty
    newSolvesThisSync: List[NewSolveItem]
    prepsdeProblemsSolved: int
    gapMessage: str


class IntegrationStatusResponse(BaseModel):
    connected: bool
    leetcodeUsername: Optional[str] = None
    connectedAt: Optional[str] = None
    baselineSlugCount: Optional[int] = None
    lastSyncAt: Optional[str] = None
    lastSyncStatus: Optional[str] = None
    verifiedSolvesCount: Optional[int] = None
    verifiedByDifficulty: Optional[VerifiedByDifficulty] = None
    prepsdeProblemsSolved: Optional[int] = None
    gapMessage: Optional[str] = None
    nextSyncAvailableAt: Optional[str] = None


class VerifiedSolveItem(BaseModel):
    titleSlug: str
    title: str
    solvedAt: str
    lang: str
    matchedProblemId: Optional[str] = None
    promptedToLog: bool


class VerifiedSolvesResponse(BaseModel):
    verifiedSolves: List[VerifiedSolveItem]
    total: int
    unloggedCount: int
