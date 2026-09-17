import os
from functools import lru_cache
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    # Supabase Settings
    SUPABASE_URL: str = ""
    SUPABASE_SERVICE_ROLE_KEY: str = ""
    SUPABASE_ANON_KEY: str = ""

    # AI / LLM Settings
    GEMINI_API_KEY: str = ""
    AI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-3.8-flash"

    # App Settings
    APP_NAME: str = "AI KYC Verification Platform API"
    ENVIRONMENT: str = "development"
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173"
    MAX_FILE_SIZE_MB: int = 15
    PORT: int = 8000

    @property
    def cors_origins_list(self) -> List[str]:
        if not self.CORS_ORIGINS:
            return ["*"]
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

    @property
    def effective_ai_key(self) -> str:
        return self.GEMINI_API_KEY or self.AI_API_KEY or os.getenv("GEMINI_API_KEY", "") or os.getenv("AI_API_KEY", "")

    @property
    def is_supabase_configured(self) -> bool:
        return bool(self.SUPABASE_URL and self.SUPABASE_SERVICE_ROLE_KEY)


@lru_cache()
def get_settings() -> Settings:
    return Settings()
