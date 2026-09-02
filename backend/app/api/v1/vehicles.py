from typing import List, Optional
from fastapi import APIRouter, Depends, Query, HTTPException, status, Request
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.detection import ANPRDetection
from app.models.camera import Camera
from app.schemas.detection import ANPRDetectionOut
from app.schemas.journey import VehicleJourneyResponse
from app.services.journey_service import journey_service
from app.integrations.vahan_adapter import vahan_adapter
from app.services.audit_service import audit_service
from app.api.v1.auth import get_current_user
from app.models.user import User

router = APIRouter(prefix="/vehicles", tags=["Vehicle Intelligence & Search"])

@router.get("/{plate}/search", response_model=List[ANPRDetectionOut])
async def search_vehicle_history(
    request: Request,
    plate: str,
    district: Optional[str] = Query(None),
    min_confidence: float = Query(0.35),
    limit: int = Query(100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)  # SEC-014: Mandatory auth — no anonymous access
):
    clean_plate = plate.replace("-", "").replace(" ", "").upper()
    query = (
        db.query(ANPRDetection, Camera)
        .join(Camera, ANPRDetection.camera_id == Camera.id)
        .filter(ANPRDetection.plate_normalized.ilike(f"%{clean_plate}%"))
        .filter(ANPRDetection.confidence >= min_confidence)
    )

    if district:
        query = query.filter(Camera.district.ilike(f"%{district}%"))

    records = query.order_by(ANPRDetection.timestamp_pts.desc()).limit(limit).all()

    # Audit log vehicle search
    audit_service.log(
        db=db,
        username=current_user.username,
        role=current_user.role,
        action="VEHICLE_SEARCH",
        resource=f"/api/vehicles/{clean_plate}",
        details={"plate_query": clean_plate, "results_found": len(records)}
    )

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

@router.get("/{plate}/journey", response_model=VehicleJourneyResponse)
async def get_vehicle_journey(
    plate: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)  # SEC-014: Mandatory auth
):
    """
    Reconstructs observed vehicle journey and infers transit corridors across the Gujarat CCTV network.
    Clearly distinguishes OBSERVED DETECTION from INFERRED MOVEMENT.
    """
    journey = journey_service.reconstruct_journey(plate, db)

    audit_service.log(
        db=db,
        username=current_user.username,
        role=current_user.role,
        action="JOURNEY_RECONSTRUCTION",
        resource=f"/api/vehicles/{plate}/journey",
        details={"plate": plate, "steps_count": len(journey.steps), "observed_points": len(journey.observed_points)}
    )
    return journey

@router.get("/{plate}/vahan")
async def get_vahan_details(plate: str):
    """
    Queries National Vehicle Registry interface (VAHAN / Sarathi adapter).
    """
    record = vahan_adapter.lookup_vehicle(plate)
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Vehicle registration record for {plate} not found in VAHAN index")
    return record
