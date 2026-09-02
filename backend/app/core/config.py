import os
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
    SECRET_KEY: str = "sentinel_secret_key_change_in_production_gujarat_cctv_2026"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440

    # Neon PostgreSQL with PostGIS
    DATABASE_URL: str = "postgresql://neondb_owner:npg_Y6Nzxe3fCRib@ep-summer-voice-ayutsy4d-pooler.c-5.us-east-2.aws.neon.tech/neondb?sslmode=require"

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

    # CORS
    BACKEND_CORS_ORIGINS: List[str] = ["*"]

settings = Settings()
