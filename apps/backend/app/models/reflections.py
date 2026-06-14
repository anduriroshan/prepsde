from pydantic import BaseModel, field_validator
from typing import Optional


class MicroLesson(BaseModel):
    title: str
    content: str
    question: Optional[str] = None


class ReflectionCreate(BaseModel):
    rating: int
    content: str

    @field_validator("rating")
    @classmethod
    def validate_rating(cls, v):
        if v < 1 or v > 5:
            raise ValueError("rating must be between 1 and 5")
        return v


class ReflectionResponse(BaseModel):
    id: str
    date: str
    rating: int
    content: str
    aiVerdict: Optional[str] = None
    aiMessage: Optional[str] = None
    microLesson: Optional[MicroLesson] = None
    prescreenResult: Optional[str] = None
    geminiCalled: bool
    submittedAt: str


class ReflectionsListResponse(BaseModel):
    reflections: list[ReflectionResponse]
    nextCursor: Optional[str] = None
    hasMore: bool
