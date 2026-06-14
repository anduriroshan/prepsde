from pydantic import BaseModel, field_validator
from typing import Optional, List


VALID_PATTERNS = {
    "arrays", "two-pointers", "sliding-window", "stack", "binary-search",
    "linked-list", "trees", "graphs", "heap", "dp", "backtracking", "tries",
    "greedy", "intervals", "bit-manipulation",
}
VALID_DIFFICULTIES = {"easy", "medium", "hard"}
VALID_SOLVED_INDEPENDENTLY = {"yes", "no", "partially"}


class ReviewHistoryItem(BaseModel):
    date: str
    struggled: bool


class ProblemCreate(BaseModel):
    name: str
    url: Optional[str] = None
    difficulty: str
    pattern: str
    solvedIndependently: str
    notes: Optional[str] = None

    @field_validator("difficulty")
    @classmethod
    def validate_difficulty(cls, v):
        if v not in VALID_DIFFICULTIES:
            raise ValueError(f"difficulty must be one of {VALID_DIFFICULTIES}")
        return v

    @field_validator("pattern")
    @classmethod
    def validate_pattern(cls, v):
        if v not in VALID_PATTERNS:
            raise ValueError(f"pattern must be one of {VALID_PATTERNS}")
        return v

    @field_validator("solvedIndependently")
    @classmethod
    def validate_solved(cls, v):
        if v not in VALID_SOLVED_INDEPENDENTLY:
            raise ValueError(f"solvedIndependently must be one of {VALID_SOLVED_INDEPENDENTLY}")
        return v


class ProblemUpdate(BaseModel):
    name: Optional[str] = None
    notes: Optional[str] = None
    url: Optional[str] = None


class ReviewRequest(BaseModel):
    struggled: bool


class ProblemResponse(BaseModel):
    id: str
    userId: str
    name: str
    url: Optional[str] = None
    difficulty: str
    pattern: str
    solvedIndependently: str
    notes: Optional[str] = None
    reviewCount: int
    nextReviewDate: str
    mastered: bool
    masteredAt: Optional[str] = None
    reviewHistory: List[ReviewHistoryItem]
    createdAt: str
    updatedAt: str


class ProblemsListResponse(BaseModel):
    problems: List[ProblemResponse]
    nextCursor: Optional[str] = None
    total: int
