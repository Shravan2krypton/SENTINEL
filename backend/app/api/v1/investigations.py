from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.services.journey_service import journey_service
from app.models.watchlist import WatchlistEntry
from app.models.alert import Alert
from app.models.detection import ANPRDetection
from app.integrations.vahan_adapter import vahan_adapter
from app.services.audit_service import audit_service
from app.api.v1.auth import get_current_user
from app.models.user import User

router = APIRouter(prefix="/investigations", tags=["Investigation Workspace & Reports"])

class CaseDossierRequest(BaseModel):
    plate_number: str
    case_title: str
    investigating_officer: str
    case_notes: Optional[str] = None

@router.post("/dossier")
async def generate_case_dossier(
    request: CaseDossierRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Assembles a comprehensive evidentiary case dossier for a target vehicle:
    - Journey timeline with observed vs inferred transit
    - ANPR detections & evidence crops
    - Watchlist and alert records
    - National vehicle registry (VAHAN) data
    """
    clean_plate = request.plate_number.replace("-", "").replace(" ", "").upper()
    journey = journey_service.reconstruct_journey(clean_plate, db)
    watchlist = db.query(WatchlistEntry).filter(WatchlistEntry.plate_number == clean_plate).first()
    alerts = db.query(Alert).filter(Alert.plate_number == clean_plate).all()
    vahan = vahan_adapter.lookup_vehicle(clean_plate)

    dossier = {
        "case_id": f"CASE-GJ-{clean_plate}-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M')}",
        "title": request.case_title,
        "investigating_officer": request.investigating_officer,
        "notes": request.case_notes,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "generated_by": current_user.username,
        "vehicle": {
            "plate_number": clean_plate,
            "vahan_registration": vahan.model_dump() if vahan else None,
            "watchlist_status": {
                "is_listed": bool(watchlist),
                "category": watchlist.category if watchlist else None,
                "priority": watchlist.priority if watchlist else None,
                "flag_reason": watchlist.description if watchlist else None
            }
        },
        "journey_reconstruction": journey.model_dump(),
        "total_alerts": len(alerts),
        "alerts_history": [
            {
                "alert_id": a.id,
                "type": a.alert_type,
                "severity": a.severity,
                "status": a.status,
                "camera_id": a.camera_id,
                "timestamp": a.timestamp_pts.isoformat(),
                "evidence_url": a.evidence_url
            } for a in alerts
        ]
    }

    audit_service.log(
        db=db,
        username=current_user.username,
        role=current_user.role,
        action="EXPORT_CASE_DOSSIER",
        resource=f"/api/investigations/dossier/{clean_plate}",
        details={"case_title": request.case_title}
    )

    return dossier
