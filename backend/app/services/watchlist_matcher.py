import uuid
from datetime import datetime, timezone
from typing import Optional, Dict, Any, Set
from sqlalchemy.orm import Session
from app.core.logger import logger
from app.core.events import event_bus, SystemEvent
from app.models.watchlist import WatchlistEntry
from app.models.alert import Alert
from app.models.camera import Camera

class WatchlistMatcherService:
    def __init__(self):
        # In-memory fast cache of active normalized plates -> WatchlistEntry dict
        self._cache: Dict[str, Dict[str, Any]] = {}
        self._last_refresh = 0.0

    def refresh_cache(self, db: Session):
        """Preloads active watchlist plates to eliminate per-frame DB scans."""
        entries = db.query(WatchlistEntry).filter(WatchlistEntry.status == "ACTIVE").all()
        new_cache = {}
        for entry in entries:
            new_cache[entry.plate_number] = {
                "id": entry.id,
                "category": entry.category,
                "priority": entry.priority,
                "description": entry.description,
                "vehicle_make_model": entry.vehicle_make_model,
                "case_number": entry.case_number
            }
        self._cache = new_cache
        logger.debug(f"Watchlist matcher cache refreshed: {len(self._cache)} active targets.")

    def evaluate_plate(
        self,
        plate_normalized: str,
        camera_id: str,
        confidence: float,
        timestamp_pts: datetime,
        evidence_url: Optional[str],
        db: Session
    ) -> Optional[Alert]:
        """
        Evaluate normalized plate against active watchlist.
        Generates Alert and dispatches to EventBus if matched.
        """
        if not self._cache:
            self.refresh_cache(db)

        match = self._cache.get(plate_normalized)
        if not match:
            # Fallback direct DB check in case recently added
            entry = db.query(WatchlistEntry).filter(
                WatchlistEntry.plate_number == plate_normalized,
                WatchlistEntry.status == "ACTIVE"
            ).first()
            if entry:
                match = {
                    "id": entry.id,
                    "category": entry.category,
                    "priority": entry.priority,
                    "description": entry.description,
                    "vehicle_make_model": entry.vehicle_make_model,
                    "case_number": entry.case_number
                }
                self._cache[plate_normalized] = match

        if not match:
            return None

        # Watchlist hit detected!
        alert_id = f"alert_{uuid.uuid4().hex[:12]}"
        alert = Alert(
            id=alert_id,
            alert_type="WATCHLIST_HIT",
            severity=match["priority"],
            plate_number=plate_normalized,
            watchlist_id=match["id"],
            camera_id=camera_id,
            timestamp_pts=timestamp_pts,
            confidence=confidence,
            evidence_url=evidence_url,
            status="ACTIVE",
            notes=f"Match on [{match['category'].upper()}] - {match['description']}"
        )
        db.add(alert)
        db.commit()

        # Query camera details for rich alert payload
        camera = db.query(Camera).filter(Camera.id == camera_id).first()
        camera_name = camera.name if camera else camera_id
        location = camera.location_name if camera else "Gujarat Corridor"
        district = camera.district if camera else "Gujarat"

        logger.warning(
            f"🚨 WATCHLIST HIT: Plate {plate_normalized} [{match['category'].upper()}] detected at {camera_name} ({location}) with confidence {confidence:.2f}"
        )

        # Dispatch alert event to WebSocket / SSE subscribers
        event_bus.publish_sync(SystemEvent(
            event_type="AlertCreated",
            camera_id=camera_id,
            payload={
                "alert_id": alert_id,
                "plate_number": plate_normalized,
                "category": match["category"],
                "severity": match["priority"],
                "description": match["description"],
                "case_number": match["case_number"],
                "camera_id": camera_id,
                "camera_name": camera_name,
                "location_name": location,
                "district": district,
                "timestamp": timestamp_pts.isoformat(),
                "confidence": confidence,
                "evidence_url": evidence_url
            }
        ))

        return alert

watchlist_matcher = WatchlistMatcherService()

# Automatically wire up EventBus listener for ANPRConfirmed events
def _on_anpr_confirmed(event: SystemEvent):
    from app.core.database import SessionLocal
    payload = event.payload
    plate = payload.get("plate")
    camera_id = event.camera_id
    conf = payload.get("confidence", 0.0)
    pts_str = payload.get("pts")
    evidence_url = payload.get("evidence_url")

    if not plate or not camera_id or not pts_str:
        return

    pts_dt = datetime.fromisoformat(pts_str)
    db = SessionLocal()
    try:
        watchlist_matcher.evaluate_plate(
            plate_normalized=plate,
            camera_id=camera_id,
            confidence=conf,
            timestamp_pts=pts_dt,
            evidence_url=evidence_url,
            db=db
        )
    finally:
        db.close()

event_bus.subscribe("ANPRConfirmed", _on_anpr_confirmed)
