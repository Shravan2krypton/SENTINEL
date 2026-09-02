from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
import httpx
from sqlalchemy.orm import Session
from sqlalchemy import func
from geoalchemy2.functions import ST_SetSRID, ST_MakePoint
from app.core.config import settings
from app.core.database import SessionLocal
from app.core.logger import logger
from app.core.events import event_bus, SystemEvent
from app.models.camera import Camera, Stream, CameraHealth
from app.schemas.sentinel_ingest import SentinelCatalogueResponse, SentinelCameraItem

class SentinelClientService:
    def __init__(self, gateway_url: Optional[str] = None):
        self.gateway_url = gateway_url or settings.SENTINEL_GATEWAY_URL

    async def fetch_catalogue(self) -> SentinelCatalogueResponse:
        """Fetch real-time camera catalogue from GET /api/ingest."""
        logger.info(f"Querying Sentinel Gateway catalogue from: {self.gateway_url}")
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.get(self.gateway_url)
                response.raise_for_status()
                data = response.json()
                catalogue = SentinelCatalogueResponse(**data)
                logger.info(f"Retrieved {len(catalogue.cameras)} cameras from Sentinel Gateway ({catalogue.gateway_id}).")
                return catalogue
        except Exception as e:
            logger.warning(f"Direct HTTP fetch to {self.gateway_url} failed ({e}). Utilizing in-process Sentinel catalogue.")
            from app.api.v1.ingest import get_sentinel_catalogue
            catalogue = await get_sentinel_catalogue()
            return catalogue

    def sync_catalogue_to_db(self, catalogue: SentinelCatalogueResponse, db: Session) -> Dict[str, Any]:
        """Synchronize validated Sentinel catalogue into local PostgreSQL camera registry."""
        added_count = 0
        updated_count = 0
        unchanged_count = 0

        for item in catalogue.cameras:
            existing = db.query(Camera).filter(Camera.id == item.camera_id).first()
            
            # PostGIS point: ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)
            geom_expr = ST_SetSRID(ST_MakePoint(item.longitude, item.latitude), 4326)

            if not existing:
                new_camera = Camera(
                    id=item.camera_id,
                    name=item.name,
                    department_id=item.department_id,
                    location_name=item.location,
                    district=item.district or "Vadodara",
                    latitude=item.latitude,
                    longitude=item.longitude,
                    geom=geom_expr,
                    codec=item.codec,
                    resolution=item.resolution,
                    reported_fps=item.reported_fps,
                    bitrate_kbps=item.bitrate_kbps or 2048,
                    rtsp_url=item.rtsp_url,
                    hls_url=item.hls_url,
                    whep_url=item.whep_url,
                    capabilities=item.capabilities,
                    status=item.live_status,
                    last_heartbeat=datetime.now(timezone.utc)
                )
                db.add(new_camera)
                db.flush()

                # Add main stream entry
                stream = Stream(
                    id=f"{item.camera_id}_MAIN",
                    camera_id=item.camera_id,
                    stream_type="MAIN",
                    url=item.rtsp_url,
                    transport=settings.RTSP_TRANSPORT,
                    codec=item.codec,
                    resolution=item.resolution,
                    fps=item.reported_fps,
                    is_active=(item.live_status == "ONLINE")
                )
                db.add(stream)

                # Record health
                health = CameraHealth(
                    camera_id=item.camera_id,
                    status=item.live_status,
                    actual_fps=item.reported_fps if item.live_status == "ONLINE" else 0.0,
                    latency_ms=45.0 if item.live_status == "ONLINE" else 0.0
                )
                db.add(health)
                added_count += 1

                event_bus.publish_sync(SystemEvent(
                    event_type="CameraOnline" if item.live_status == "ONLINE" else "CameraOffline",
                    camera_id=item.camera_id,
                    payload={"name": item.name, "location": item.location, "codec": item.codec}
                ))
            else:
                # Detect changes
                has_changed = False
                if existing.status != item.live_status:
                    existing.status = item.live_status
                    has_changed = True
                    event_bus.publish_sync(SystemEvent(
                        event_type="CameraOnline" if item.live_status == "ONLINE" else "CameraOffline",
                        camera_id=item.camera_id,
                        payload={"status": item.live_status}
                    ))
                if existing.rtsp_url != item.rtsp_url:
                    existing.rtsp_url = item.rtsp_url
                    has_changed = True
                if existing.codec != item.codec:
                    existing.codec = item.codec
                    has_changed = True
                if existing.latitude != item.latitude or existing.longitude != item.longitude:
                    existing.latitude = item.latitude
                    existing.longitude = item.longitude
                    existing.geom = geom_expr
                    has_changed = True

                existing.last_heartbeat = datetime.now(timezone.utc)

                if has_changed:
                    existing.updated_at = datetime.now(timezone.utc)
                    updated_count += 1
                else:
                    unchanged_count += 1

        db.commit()
        result = {
            "gateway_id": catalogue.gateway_id,
            "total_received": len(catalogue.cameras),
            "added": added_count,
            "updated": updated_count,
            "unchanged": unchanged_count,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        logger.info(f"Catalogue sync completed: {result}")
        return result

sentinel_client = SentinelClientService()
