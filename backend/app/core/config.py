import os
import secrets
from typing import List, Optional
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

    ENVIRONMENT: str = "development"
    PROJECT_NAME: str = "Sentinel CCTV Intelligence Platform"
    API_V1_STR: str = "/api"

    # SEC-001 FIX: No default secret — application will raise on startup if not set in .env
    # Rotate the key if the previous value "sentinel_secret_key_change_in_production_gujarat_cctv_2026"
    # was exposed in git history.
    SECRET_KEY: str = ""
    ALGORITHM: str = "HS256"

    # SEC-012 FIX: Reduced from 1440 (24h) to 480 (8h) to shrink stolen-token exposure window
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480

    # SEC-001 FIX: No default DATABASE_URL — must come from .env or environment
    DATABASE_URL: str = ""

    # Redis Cache (supports local Redis or graceful in-memory fallback)
    REDIS_URL: Optional[str] = "redis://localhost:6379/0"

    # Sentinel Ingest Gateway
    SENTINEL_GATEWAY_URL: str = "http://localhost:8000/api/ingest"
    SENTINEL_SYNC_INTERVAL_SECONDS: int = 60

    # Streaming Configuration
    RTSP_TRANSPORT: str = "tcp"
    STREAM_RECONNECT_MAX_BACKOFF: int = 30
    FRAME_SAMPLE_INTERVAL: int = 3

    # AI Pipeline
    YOLO_MODEL: str = "yolov8n.pt"
    DETECTION_CONFIDENCE_THRESHOLD: float = 0.35
    ANPR_CONFIDENCE_THRESHOLD: float = 0.60
    DEVICE: str = "cpu"

    # SEC-004 FIX: Explicit CORS origins — no wildcard.
    # Override in .env: BACKEND_CORS_ORIGINS=["https://sentinel.gujarat.gov.in"]
    BACKEND_CORS_ORIGINS: List[str] = ["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173"]

    # Brute-force protection — max failed login attempts before lockout
    LOGIN_MAX_ATTEMPTS: int = 5
    LOGIN_LOCKOUT_SECONDS: int = 300  # 5 minutes

    def validate_critical_secrets(self):
        """Fail fast if critical secrets are missing or still set to known-bad values."""
        bad_defaults = {
            "sentinel_secret_key_change_in_production_gujarat_cctv_2026",
            "change_this_to_a_secure_random_string_in_production",
            "",
        }
        if self.SECRET_KEY in bad_defaults:
            raise RuntimeError(
                "FATAL: SECRET_KEY is not set or is using a known-compromised default. "
                "Set SECRET_KEY in your .env file to a cryptographically random value. "
                f"Generate one with: python -c \"import secrets; print(secrets.token_hex(64))\""
            )
        if not self.DATABASE_URL:
            raise RuntimeError(
                "FATAL: DATABASE_URL is not set. Set DATABASE_URL in your .env file."
            )

settings = Settings()
