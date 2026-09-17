import logging
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query, status

from app.services.kyc_service import kyc_service
from app.schemas.case import (
    KYCCaseCreate,
    KYCCaseDetail,
    KYCCaseListItem,
    IssueInfo,
    VerificationResultInfo,
)

router = APIRouter(prefix="/api/kyc", tags=["KYC Cases"])
logger = logging.getLogger("kyc.routes.kyc")


@router.post("", response_model=KYCCaseDetail, status_code=status.HTTP_201_CREATED)
def create_kyc_case(data: KYCCaseCreate):
    """Creates a new customer record and KYC case."""
    try:
        return kyc_service.create_case(data)
    except Exception as e:
        logger.error(f"Error creating case: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create KYC case: {str(e)}"
        )


@router.get("", response_model=List[KYCCaseListItem])
def list_kyc_cases(
    status: Optional[str] = Query(None, description="Filter by case status (e.g. VERIFIED, NEEDS_REVIEW, PROCESSING)"),
    search: Optional[str] = Query(None, description="Search by customer name, customer ID, or case number"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0)
):
    """Returns a paginated list of KYC cases with optional status filtering and query search."""
    try:
        return kyc_service.list_cases(status=status, search=search, limit=limit, offset=offset)
    except Exception as e:
        logger.error(f"Error listing cases: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch KYC cases: {str(e)}"
        )


@router.get("/{case_id}", response_model=KYCCaseDetail)
def get_kyc_case(case_id: str):
    """Retrieves full details of a specific KYC case."""
    try:
        return kyc_service.get_case_detail(case_id)
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(ve))
    except Exception as e:
        logger.error(f"Error fetching case detail: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch case: {str(e)}"
        )


@router.post("/{case_id}/process", response_model=KYCCaseDetail)
def trigger_case_processing(case_id: str):
    """Triggers the automated document extraction, AI analysis, and validation pipeline."""
    try:
        return kyc_service.process_case(case_id)
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(ve))
    except Exception as e:
        logger.error(f"Error processing case: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Document processing failed: {str(e)}"
        )


@router.get("/{case_id}/results", response_model=Optional[VerificationResultInfo])
def get_case_results(case_id: str):
    """Fetches the verification result for a case."""
    case = kyc_service.get_case_detail(case_id)
    return case.verification_result


@router.get("/{case_id}/issues", response_model=List[IssueInfo])
def get_case_issues(case_id: str):
    """Fetches detected issues for a case."""
    case = kyc_service.get_case_detail(case_id)
    return case.issues
