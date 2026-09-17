import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import get_settings
from app.database.supabase_client import SupabaseConfigurationError, supabase_service
from app.api.routes import kyc, documents, review, dashboard, health

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("kyc.main")

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info(f"Starting {settings.APP_NAME} in {settings.ENVIRONMENT} mode...")
    if not settings.is_supabase_configured:
        logger.warning(
            "SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not set. "
            "Please configure backend/.env before executing database transactions."
        )
    if not settings.effective_ai_key:
        logger.warning(
            "GEMINI_API_KEY is not set. Document analysis will operate in heuristic fallback mode."
        )
    yield
    logger.info("Shutting down KYC Verification Platform backend.")


app = FastAPI(
    title=settings.APP_NAME,
    description="Production-grade AI KYC Verification Platform with Supabase, PDF/OCR extraction, and Google Gemini.",
    version="1.0.0",
    lifespan=lifespan
)

# CORS Middleware configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Exception handlers
@app.exception_handler(SupabaseConfigurationError)
async def supabase_config_exception_handler(request: Request, exc: SupabaseConfigurationError):
    return JSONResponse(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        content={
            "error": "Database Unconfigured",
            "message": str(exc),
            "hint": "Please create a Supabase project, execute the SQL migrations in supabase/migrations/, and add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to backend/.env."
        }
    )


# Include Routers
app.include_router(health.router)
app.include_router(kyc.router)
app.include_router(documents.router)
app.include_router(review.router)
app.include_router(dashboard.router)


@app.get("/")
def root():
    return {
        "service": settings.APP_NAME,
        "version": "1.0.0",
        "docs_url": "/docs",
        "health_check": "/api/health"
    }
