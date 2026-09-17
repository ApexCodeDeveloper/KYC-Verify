import logging
from typing import Any, Dict, List, Optional
from app.config import get_settings

logger = logging.getLogger("kyc.supabase")

class SupabaseConfigurationError(Exception):
    """Raised when Supabase credentials are not configured."""
    pass

class SupabaseClientService:
    def __init__(self):
        self.settings = get_settings()
        self._client = None
        self._init_client()

    def _init_client(self):
        if not self.settings.is_supabase_configured:
            logger.warning(
                "Supabase is not configured! SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY "
                "must be provided in the backend environment."
            )
            return

        try:
            from supabase import create_client, Client
            self._client: Client = create_client(
                self.settings.SUPABASE_URL,
                self.settings.SUPABASE_SERVICE_ROLE_KEY
            )
            logger.info("Supabase admin client initialized successfully.")
        except Exception as e:
            logger.error(f"Failed to initialize Supabase client: {e}")
            self._client = None

    @property
    def client(self):
        if not self._client:
            if not self.settings.is_supabase_configured:
                raise SupabaseConfigurationError(
                    "Supabase is not configured. Please configure SUPABASE_URL and "
                    "SUPABASE_SERVICE_ROLE_KEY in your backend .env file."
                )
            self._init_client()
            if not self._client:
                raise SupabaseConfigurationError("Could not establish connection to Supabase.")
        return self._client

    def is_ready(self) -> bool:
        return self.settings.is_supabase_configured and self._client is not None

    # =========================================================================
    # Storage Operations
    # =========================================================================
    def upload_document_to_storage(
        self, bucket: str, destination_path: str, file_bytes: bytes, content_type: str
    ) -> str:
        """Uploads a document to the private Supabase storage bucket."""
        try:
            response = self.client.storage.from_(bucket).upload(
                path=destination_path,
                file=file_bytes,
                file_options={"content-type": content_type, "upsert": "true"}
            )
            return destination_path
        except Exception as e:
            logger.error(f"Failed to upload document to Supabase storage '{bucket}': {e}")
            raise

    def download_document_from_storage(self, bucket: str, file_path: str) -> bytes:
        """Downloads document bytes from Supabase storage."""
        try:
            res = self.client.storage.from_(bucket).download(file_path)
            return res
        except Exception as e:
            logger.error(f"Failed to download document from Supabase storage: {e}")
            raise

    def create_signed_url(self, bucket: str, file_path: str, expires_in: int = 3600) -> str:
        """Creates a secure signed URL for temporary authenticated document preview."""
        try:
            res = self.client.storage.from_(bucket).create_signed_url(file_path, expires_in)
            if isinstance(res, dict) and "signedURL" in res:
                return res["signedURL"]
            elif hasattr(res, "signed_url"):
                return res.signed_url
            elif isinstance(res, dict) and "signedUrl" in res:
                return res["signedUrl"]
            return str(res)
        except Exception as e:
            logger.error(f"Failed to generate signed URL for '{file_path}': {e}")
            return ""

    # =========================================================================
    # Audit Log Helper
    # =========================================================================
    def log_audit(
        self,
        action: str,
        case_id: Optional[str] = None,
        user_id: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ):
        """Records an audit log entry in the audit_logs table."""
        try:
            payload = {
                "action": action,
                "case_id": case_id,
                "user_id": user_id,
                "metadata": metadata or {}
            }
            self.client.table("audit_logs").insert(payload).execute()
        except Exception as e:
            logger.warning(f"Audit log recording failed: {e}")


# Singleton instance
supabase_service = SupabaseClientService()
