import os
from typing import Any, List, Union
from pydantic import AnyHttpUrl, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), ".env"),
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore"
    )

    PROJECT_NAME: str = "Enterprise SMS Campaign Management API"
    API_V1_STR: str = "/api/v1"

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/bulk_sms_db"

    # Redis & Celery
    REDIS_URL: str = "redis://localhost:6379/0"
    CELERY_BROKER_URL: str = "redis://localhost:6379/0"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/0"

    # JWT
    JWT_SECRET_KEY: str = "9a3cf8d4b3c0be8d56b6279f0f971b4028bb46fe5d1b7a2d8e0e7a2c5a6b7e8d"
    JWT_REFRESH_SECRET_KEY: str = "8f3c7a2d5e6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # CORS
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://localhost:8000",
        "https://bulk-sms-system-nu.vercel.app"
    ]

    @field_validator("BACKEND_CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Any) -> List[str]:
        if isinstance(v, str):
            v_str = v.strip()
            if v_str.startswith("[") and v_str.endswith("]"):
                try:
                    import json
                    parsed = json.loads(v_str)
                    if isinstance(parsed, list):
                        return [str(item).strip().rstrip("/") for item in parsed if item]
                except Exception:
                    pass
            return [i.strip().rstrip("/") for i in v_str.split(",") if i.strip()]
        elif isinstance(v, (list, tuple, set)):
            return [str(item).strip().rstrip("/") for item in v if item]
        return ["http://localhost:5173", "http://localhost:3000", "https://bulk-sms-system-nu.vercel.app"]

    # Rate Limiting
    RATE_LIMIT_PER_MINUTE: int = 60

    # SMS Gateway Configurations
    SMS_GATEWAY: str = "SMSLENZ"
    SMSLENZ_USER_ID: Union[str, None] = None
    SMSLENZ_API_KEY: Union[str, None] = None
    SMSLENZ_SENDER_ID: Union[str, None] = "SMSBLAST"
    SMSLENZ_BASE_URL: str = "https://smslenz.lk/api"

    # Notify.lk Gateway Configurations
    NOTIFY_USER_ID: Union[str, None] = None
    NOTIFY_API_KEY: Union[str, None] = None
    NOTIFY_SENDER_ID: Union[str, None] = "NotifyDEMO"
    NOTIFY_BASE_URL: str = "https://app.notify.lk/api/v1"


settings = Settings()

