from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class DocumentUploadResponse(BaseModel):
    id: str
    case_id: str
    file_name: str
    file_type: str
    storage_path: str
    file_size: int
    document_type_detected: str
    status: str
    created_at: datetime
    signed_url: Optional[str] = None


class DocumentSignedUrlResponse(BaseModel):
    document_id: str
    signed_url: str
    expires_in_seconds: int = 3600
