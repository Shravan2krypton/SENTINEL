from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.alert import Alert
from app.models.camera import Camera
from app.schemas.alert import AlertOut, AlertStatusUpdate
from app.services.audit_service import audit_service
from app.api.v1.auth import get_current_user
from app.models.user import User

router = APIRouter(prefix="/alerts", tags=["Alert Management"])

@router.get("", response_model=List[AlertOut])
async def list_alerts(
    status: Optional[str] = Query(None, description="ACTIVE, ACKNOWLEDGED, RESOLVED, DISMISSED"),
    severity: Optional[str] = Query(None, description="CRITICAL, HIGH, MEDIUM, LOW"),
    district: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)  # SEC-009: Alert data requires authentication
):
    query = (
        db.query(Alert, Camera)
        .join(Camera, Alert.camera_id == Camera.id)
    )

    if status:
        query = query.filter(Alert.status == status.upper())
    if severity:
        query = query.filter(Alert.severity == severity.upper())
    if district:
        query = query.filter(Camera.district.ilike(f"%{district}%"))

    records = query.order_by(Alert.created_at.desc()).limit(limit).all()

    results = []
    for alert, cam in records:
        results.append(AlertOut(
            id=alert.id,
            alert_type=alert.alert_type,
            severity=alert.severity,
            plate_number=alert.plate_number,
            watchlist_id=alert.watchlist_id,
            camera_id=alert.camera_id,
            camera_name=cam.name,
            location_name=cam.location_name,
            district=cam.district,
            latitude=cam.latitude,
            longitude=cam.longitude,
            timestamp_pts=alert.timestamp_pts,
            confidence=alert.confidence,
            evidence_url=alert.evidence_url,
            status=alert.status,
            assigned_user=alert.assigned_user,
            notes=alert.notes,
            created_at=alert.created_at,
            acknowledged_at=alert.acknowledged_at,
            resolved_at=alert.resolved_at
        ))
    return results

@router.put("/{alert_id}/status", response_model=AlertOut)
async def update_alert_status(
    alert_id: str,
    status_in: AlertStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Alert {alert_id} not found")

    new_status = status_in.status.upper()
    alert.status = new_status
    if status_in.notes:
        alert.notes = f"{alert.notes or ''}\n[{datetime.now(timezone.utc).strftime('%H:%M:%S')} {current_user.username}]: {status_in.notes}"

    alert.assigned_user = current_user.username
    if new_status == "ACKNOWLEDGED":
        alert.acknowledged_at = datetime.now(timezone.utc)
    elif new_status in ("RESOLVED", "DISMISSED"):
        alert.resolved_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(alert)

    cam = db.query(Camera).filter(Camera.id == alert.camera_id).first()

    audit_service.log(
        db=db,
        username=current_user.username,
        role=current_user.role,
        action="UPDATE_ALERT_STATUS",
        resource=f"/api/alerts/{alert_id}",
        details={"status": new_status, "notes": status_in.notes}
    )

    return AlertOut(
        id=alert.id,
        alert_type=alert.alert_type,
        severity=alert.severity,
        plate_number=alert.plate_number,
        watchlist_id=alert.watchlist_id,
        camera_id=alert.camera_id,
        camera_name=cam.name if cam else None,
        location_name=cam.location_name if cam else None,
        district=cam.district if cam else None,
        latitude=cam.latitude if cam else None,
        longitude=cam.longitude if cam else None,
        timestamp_pts=alert.timestamp_pts,
        confidence=alert.confidence,
        evidence_url=alert.evidence_url,
        status=alert.status,
        assigned_user=alert.assigned_user,
        notes=alert.notes,
        created_at=alert.created_at,
        acknowledged_at=alert.acknowledged_at,
        resolved_at=alert.resolved_at
    )

@router.get("/summary/stats")
async def get_alert_stats(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):  # SEC-009
    total_active = db.query(Alert).filter(Alert.status == "ACTIVE").count()
    critical_active = db.query(Alert).filter(Alert.status == "ACTIVE", Alert.severity == "CRITICAL").count()
    high_active = db.query(Alert).filter(Alert.status == "ACTIVE", Alert.severity == "HIGH").count()
    acknowledged = db.query(Alert).filter(Alert.status == "ACKNOWLEDGED").count()
    resolved = db.query(Alert).filter(Alert.status == "RESOLVED").count()

    return {
        "active_total": total_active,
        "active_critical": critical_active,
        "active_high": high_active,
        "acknowledged": acknowledged,
        "resolved": resolved
    }
