import logging
from fastapi import APIRouter, File, HTTPException, UploadFile, status

from app.config import get_settings
from app.services.kyc_service import kyc_service
from app.database.supabase_client import supabase_service
from app.schemas.document import DocumentSignedUrlResponse, DocumentUploadResponse

router = APIRouter(prefix="/api", tags=["Documents"])
logger = logging.getLogger("kyc.routes.documents")

ALLOWED_MIME_TYPES = {
    "application/pdf",
    "image/jpeg",
    "image/jpg",
    "image/png"
}


@router.post("/kyc/{case_id}/documents", response_model=DocumentUploadResponse, status_code=status.HTTP_201_CREATED)
async def upload_document_for_case(case_id: str, file: UploadFile = File(...)):
    """
    Uploads a real customer document (PDF, JPG, PNG) to the private Supabase Storage bucket.
    Validates file format, size limits, and non-empty content.
    """
    settings = get_settings()

    # 1. Validate MIME type
    content_type = (file.content_type or "").lower()
    lower_filename = (file.filename or "").lower()

    is_valid_mime = (
        content_type in ALLOWED_MIME_TYPES or
        lower_filename.endswith((".pdf", ".jpg", ".jpeg", ".png"))
    )

    if not is_valid_mime:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file format '{content_type}'. Supported formats: PDF, JPEG, JPG, PNG."
        )

    # 2. Read file bytes and validate size
    try:
        file_bytes = await file.read()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to read uploaded file: {str(e)}"
        )

    if not file_bytes or len(file_bytes) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The uploaded file is empty (0 bytes)."
        )

    max_bytes = settings.MAX_FILE_SIZE_MB * 1024 * 1024
    if len(file_bytes) > max_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File exceeds maximum allowed size of {settings.MAX_FILE_SIZE_MB}MB (Actual size: {len(file_bytes) / (1024 * 1024):.2f}MB)."
        )

    # Normalize content type if missing
    if not content_type or content_type == "application/octet-stream":
        if lower_filename.endswith(".pdf"):
            content_type = "application/pdf"
        elif lower_filename.endswith((".jpg", ".jpeg")):
            content_type = "image/jpeg"
        elif lower_filename.endswith(".png"):
            content_type = "image/png"

    try:
        return kyc_service.upload_document(
            case_id=case_id,
            file_bytes=file_bytes,
            file_name=file.filename or "document",
            content_type=content_type
        )
    except Exception as e:
        logger.error(f"Failed to store document: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upload document to storage: {str(e)}"
        )


@router.get("/documents/{doc_id}/signed-url", response_model=DocumentSignedUrlResponse)
def get_document_signed_url(doc_id: str):
    """Generates a temporary authenticated signed URL to preview the document."""
    try:
        client = supabase_service.client
        doc_res = client.table("documents").select("storage_path").eq("id", doc_id).execute()
        if not doc_res.data:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found.")

        storage_path = doc_res.data[0]["storage_path"]
        url = supabase_service.create_signed_url("kyc-documents", storage_path, 3600)
        return DocumentSignedUrlResponse(
            document_id=doc_id,
            signed_url=url,
            expires_in_seconds=3600
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating signed URL: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate signed document URL: {str(e)}"
        )
