import os
import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.core.config import settings
from app.core.logger import setup_logging, logger
from app.core.database import init_db, SessionLocal
from app.core.seed import seed_initial_data
from app.core.events import event_bus
from app.services.sentinel_client import sentinel_client
from app.services.stream_manager import stream_manager

# API Routers
from app.api.v1.auth import router as auth_router
from app.api.v1.ingest import router as ingest_router
from app.api.v1.cameras import router as cameras_router
from app.api.v1.streams import router as streams_router
from app.api.v1.detections import router as detections_router
from app.api.v1.vehicles import router as vehicles_router
from app.api.v1.watchlist import router as watchlist_router
from app.api.v1.alerts import router as alerts_router
from app.api.v1.investigations import router as investigations_router
from app.api.v1.discovery import router as discovery_router
from app.api.v1.cases import router as cases_router
from app.api.v1.system import router as system_router
from app.api.v1.ws import router as ws_router
from app.core.security_headers import SecurityHeadersMiddleware

setup_logging()

async def background_sentinel_sync():
    """Periodically check and synchronize with Sentinel Camera Grid catalogue."""
    await asyncio.sleep(2)  # Allow server boot
    while True:
        try:
            catalogue = await sentinel_client.fetch_catalogue()
            db = SessionLocal()
            try:
                sentinel_client.sync_catalogue_to_db(catalogue, db)
            finally:
                db.close()
        except Exception as e:
            logger.warning(f"Background Sentinel sync retry: {e}")
        await asyncio.sleep(settings.SENTINEL_SYNC_INTERVAL_SECONDS)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Initializing Sentinel CCTV Intelligence Platform...")
    # SEC-001: Fail fast if critical secrets are missing or compromised
    settings.validate_critical_secrets()
    init_db()
    seed_initial_data()
    event_bus.start()
    sync_task = asyncio.create_task(background_sentinel_sync())
    logger.info("Sentinel Platform startup complete and operational.")
    yield
    # Shutdown
    sync_task.cancel()
    await event_bus.stop()
    stream_manager.stop_all()
    logger.info("Sentinel Platform services gracefully stopped.")

# SEC-010: Swagger/ReDoc docs disabled in production to reduce attack surface
_docs_url = "/docs" if settings.ENVIRONMENT != "production" else None
_redoc_url = "/redoc" if settings.ENVIRONMENT != "production" else None

app = FastAPI(
    title=settings.PROJECT_NAME,
    version="1.0.0",
    description="Interoperability and Intelligence Platform for Gujarat CCTV Network (Sentinel Camera Grid)",
    docs_url=_docs_url,
    redoc_url=_redoc_url,
    lifespan=lifespan
)

# SEC-004: Explicit CORS origins — wildcard removed
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept", "X-Request-ID"],
)

# SEC-011: Security headers on every response
app.add_middleware(SecurityHeadersMiddleware, environment=settings.ENVIRONMENT)

# Mount Evidence Static Directory
evidence_dir = os.path.join(os.getcwd(), "evidence")
os.makedirs(os.path.join(evidence_dir, "crops"), exist_ok=True)
app.mount("/evidence", StaticFiles(directory=os.path.join(evidence_dir, "crops")), name="evidence")

# Include Routers
app.include_router(system_router)
app.include_router(auth_router, prefix=settings.API_V1_STR)
app.include_router(ingest_router, prefix=settings.API_V1_STR)
app.include_router(cameras_router, prefix=settings.API_V1_STR)
app.include_router(streams_router, prefix=settings.API_V1_STR)
app.include_router(detections_router, prefix=settings.API_V1_STR)
app.include_router(vehicles_router, prefix=settings.API_V1_STR)
app.include_router(watchlist_router, prefix=settings.API_V1_STR)
app.include_router(alerts_router, prefix=settings.API_V1_STR)
app.include_router(investigations_router, prefix=settings.API_V1_STR)
app.include_router(discovery_router, prefix=settings.API_V1_STR)
app.include_router(cases_router, prefix=settings.API_V1_STR)
app.include_router(ws_router)

@app.get("/")
def root():
    return {
        "service": settings.PROJECT_NAME,
        "status": "operational",
        "docs": "/docs",
        "health": "/health",
        "version": "1.0.0"
    }
