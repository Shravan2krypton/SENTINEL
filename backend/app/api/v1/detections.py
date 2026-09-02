from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.detection import ANPRDetection
from app.models.camera import Camera
from app.schemas.detection import ANPRDetectionOut

router = APIRouter(prefix="/detections", tags=["ANPR Detections"])

@router.get("", response_model=List[ANPRDetectionOut])
async def get_recent_detections(
    camera_id: Optional[str] = Query(None, description="Filter by camera ID"),
    district: Optional[str] = Query(None, description="Filter by district"),
    min_confidence: float = Query(0.35, ge=0.0, le=1.0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db)
):
    query = (
        db.query(ANPRDetection, Camera)
        .join(Camera, ANPRDetection.camera_id == Camera.id)
        .filter(ANPRDetection.confidence >= min_confidence)
    )

    if camera_id:
        query = query.filter(ANPRDetection.camera_id == camera_id)
    if district:
        query = query.filter(Camera.district.ilike(f"%{district}%"))

    records = query.order_by(ANPRDetection.timestamp_pts.desc()).limit(limit).all()

    results = []
    for det, cam in records:
        results.append(ANPRDetectionOut(
            id=det.id,
            camera_id=det.camera_id,
            camera_name=cam.name,
            location_name=cam.location_name,
            district=cam.district,
            latitude=cam.latitude,
            longitude=cam.longitude,
            plate_raw=det.plate_raw,
            plate_normalized=det.plate_normalized,
            confidence=det.confidence,
            timestamp_pts=det.timestamp_pts,
            vehicle_class=det.vehicle_class,
            track_id=det.track_id,
            bbox=det.bbox or [0, 0, 0, 0],
            evidence_reference=det.evidence_reference,
            created_at=det.created_at
        ))
    return results
