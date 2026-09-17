import logging
from fastapi import APIRouter, HTTPException, status

from app.services.kyc_service import kyc_service
from app.schemas.stats import DashboardStats

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])
logger = logging.getLogger("kyc.routes.dashboard")


@router.get("/stats", response_model=DashboardStats)
def get_dashboard_metrics():
    """
    Returns live statistics computed directly from the Supabase database:
    counts by verification status, recent cases, and the review queue.
    """
    try:
        return kyc_service.get_dashboard_stats()
    except Exception as e:
        logger.error(f"Error fetching dashboard stats: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch dashboard metrics: {str(e)}"
        )
