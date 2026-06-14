from pydantic import BaseModel
from typing import List, Optional


class PhaseProgress(BaseModel):
    current: int
    label: str
    weekCurrent: int
    weekTotal: int
    progressPercent: int
    gateMet: bool
    gateDescription: str


class HeatmapCell(BaseModel):
    date: str
    intensity: int


class Heatmap(BaseModel):
    startDate: str
    endDate: str
    cells: List[HeatmapCell]


class TopicMasteryItem(BaseModel):
    pattern: str
    solved: int
    mastered: int
    total: int
    pct: int


class WeeklySummary(BaseModel):
    weekId: str
    weekLabel: str
    problems: int
    systemDesign: int
    reflections: int
    avgRating: float
    avgVerdict: Optional[str] = None
    verdictColor: str
    deadlineChange: str
    paceStatus: str


class ProgressResponse(BaseModel):
    phase: PhaseProgress
    heatmap: Heatmap
    topicMastery: List[TopicMasteryItem]
    weeklySummaries: List[WeeklySummary]
