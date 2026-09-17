from typing import Optional
from pydantic import BaseModel
from .case import ReviewDecision


class ReviewCreate(BaseModel):
    decision: ReviewDecision
    notes: Optional[str] = None
    reviewer_id: Optional[str] = None
