from typing import Dict, List
from pydantic import BaseModel
from .case import KYCStatus, KYCCaseListItem


class DashboardStats(BaseModel):
    total_cases: int = 0
    verified_count: int = 0
    processing_count: int = 0
    needs_review_count: int = 0
    rejected_count: int = 0
    failed_count: int = 0
    status_distribution: Dict[str, int] = {}
    recent_cases: List[KYCCaseListItem] = []
    review_queue: List[KYCCaseListItem] = []
