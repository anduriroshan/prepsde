from pydantic import BaseModel
from typing import Optional


class CoachRequest(BaseModel):
    reflectionId: str
    content: str  # single content field (not accomplished/struggled/tomorrowPlan)
    rating: Optional[int] = None


class CoachResponse(BaseModel):
    verdict: str  # "deep_work" | "surface" | "lazy"
    feedback: str
    lessonTitle: str
    lessonContent: str
    prescreenResult: str
    geminiCalled: bool
