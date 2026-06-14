import logging
from typing import Optional
from pydantic_settings import BaseSettings, SettingsConfigDict

logger = logging.getLogger(__name__)


class Settings(BaseSettings):
    GOOGLE_CLOUD_PROJECT: str = "prepsde-prod"
    GOOGLE_APPLICATION_CREDENTIALS: Optional[str] = None
    FIRESTORE_DATABASE: str = "(default)"
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-2.0-flash-lite"
    SCHEDULER_SECRET: str = ""
    LEETCODE_API_BASE_URL: str = "https://alfa-leetcode-api.onrender.com"
    ALLOWED_ORIGINS: str = "http://localhost:8081"
    LOG_LEVEL: str = "INFO"
    ENVIRONMENT: str = "development"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
