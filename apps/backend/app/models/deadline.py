from pydantic import BaseModel
from typing import List, Optional


class AdjustmentRecord(BaseModel):
    id: str
    triggeredBy: str
    daysDelta: int
    previousDeadline: str
    newDeadline: str
    reason: str
    computedAt: str


class PhaseGateRequirements(BaseModel):
    problemsRequired: int
    problemsSolved: int
    reflectionsRequired: int
    reflectionsLogged: int


class PhaseGateStatus(BaseModel):
    currentPhase: int
    gateRequirements: PhaseGateRequirements
    gateMet: bool
    blockedMessage: Optional[str] = None


class DeadlineResponse(BaseModel):
    targetDate: str
    originalDeadline: str
    daysLeft: int
    paceStatus: str
    totalDaysDelta: int
    adjustmentHistory: List[AdjustmentRecord]
    phaseGateStatus: PhaseGateStatus


class NightlyResponse(BaseModel):
    usersProcessed: int
    adjustmentsMade: int
    usersSkipped: int
    processingTimeMs: int
