import logging
from fastapi import APIRouter, HTTPException, status

from app.services.kyc_service import kyc_service
from app.schemas.case import KYCCaseDetail
from app.schemas.review import ReviewCreate

router = APIRouter(prefix="/api/kyc", tags=["Compliance Review"])
logger = logging.getLogger("kyc.routes.review")


@router.post("/{case_id}/review", response_model=KYCCaseDetail)
def submit_human_review(case_id: str, review: ReviewCreate):
    """
    Submits a human compliance reviewer's decision (APPROVE, REJECT, REQUEST_INFO)
    with notes and updates case status and audit trail.
    """
    try:
        # Default reviewer ID if not provided in header/payload
        reviewer_id = review.reviewer_id or "00000000-0000-0000-0000-000000000000"
        return kyc_service.submit_review(
            case_id=case_id,
            reviewer_id=reviewer_id,
            decision=review.decision,
            notes=review.notes
        )
    except Exception as e:
        logger.error(f"Error submitting review: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to submit compliance review: {str(e)}"
        )
