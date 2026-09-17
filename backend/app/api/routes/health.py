import shutil
from fastapi import APIRouter
from app.config import get_settings
from app.database.supabase_client import supabase_service

router = APIRouter(tags=["Health & System"])


@router.get("/api/health")
def system_health_check():
    """
    Returns the real-time operational status of backend services:
    Supabase database connection, Gemini AI extraction status, and OCR availability.
    """
    settings = get_settings()

    db_ready = False
    db_error = None
    if settings.is_supabase_configured:
        try:
            # Ping Supabase with a lightweight query
            supabase_service.client.table("profiles").select("id").limit(1).execute()
            db_ready = True
        except Exception as e:
            db_error = str(e)

    ai_configured = bool(settings.effective_ai_key)
    has_tesseract = bool(shutil.which("tesseract"))

    return {
        "status": "healthy" if db_ready else "degraded",
        "version": "1.0.0",
        "environment": settings.ENVIRONMENT,
        "database": {
            "configured": settings.is_supabase_configured,
            "connected": db_ready,
            "error": db_error
        },
        "ai": {
            "provider": "Google Gemini",
            "model": settings.GEMINI_MODEL,
            "configured": ai_configured,
            "status": "Ready" if ai_configured else "Key missing (GEMINI_API_KEY required for full multimodal analysis; heuristic fallback active)"
        },
        "ocr": {
            "engine": "Pytesseract / PyPDF text streams",
            "tesseract_binary_detected": has_tesseract
        }
    }
