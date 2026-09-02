from typing import List, Optional
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.camera import Camera, CameraHealth, Department
from app.schemas.camera import CameraOut, CameraHealthOut, CameraUpdate
from app.services.sentinel_client import sentinel_client
from app.services.audit_service import audit_service
from app.api.v1.auth import get_current_user
from app.models.user import User

router = APIRouter(prefix="/cameras", tags=["Camera Registry"])

@router.get("", response_model=List[CameraOut])
async def list_cameras(
    district: Optional[str] = Query(None, description="Filter by district"),
    status: Optional[str] = Query(None, description="Filter by status (ONLINE, OFFLINE)"),
    codec: Optional[str] = Query(None, description="Filter by codec (H264, H265)"),
    db: Session = Depends(get_db)
):
    query = db.query(Camera)
    if district:
        query = query.filter(Camera.district.ilike(f"%{district}%"))
    if status:
        query = query.filter(Camera.status == status.upper())
    if codec:
        query = query.filter(Camera.codec == codec.upper())
    
    cameras = query.order_by(Camera.id.asc()).all()
    return cameras

@router.get("/{camera_id}", response_model=CameraOut)
async def get_camera(camera_id: str, db: Session = Depends(get_db)):
    camera = db.query(Camera).filter(Camera.id == camera_id).first()
    if not camera:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Camera {camera_id} not found")
    return camera

@router.get("/{camera_id}/health", response_model=List[CameraHealthOut])
async def get_camera_health(camera_id: str, limit: int = 10, db: Session = Depends(get_db)):
    records = (
        db.query(CameraHealth)
        .filter(CameraHealth.camera_id == camera_id)
        .order_by(CameraHealth.timestamp.desc())
        .limit(limit)
        .all()
    )
    return records

@router.post("/sync-sentinel")
async def trigger_sentinel_sync(db: Session = Depends(get_db)):
    """
    Triggers dynamic discovery and synchronization with the Sentinel Gateway catalogue.
    Consumes GET /api/ingest as the single source of truth.
    """
    try:
        catalogue = await sentinel_client.fetch_catalogue()
        summary = sentinel_client.sync_catalogue_to_db(catalogue, db)
        return {"status": "success", "message": "Sentinel catalogue synchronized successfully", "data": summary}
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=f"Failed to sync Sentinel catalogue: {str(e)}")

@router.put("/{camera_id}", response_model=CameraOut)
async def update_camera(
    camera_id: str,
    update_data: CameraUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    camera = db.query(Camera).filter(Camera.id == camera_id).first()
    if not camera:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Camera {camera_id} not found")

    if update_data.name is not None:
        camera.name = update_data.name
    if update_data.status is not None:
        camera.status = update_data.status
    if update_data.is_ai_enabled is not None:
        camera.is_ai_enabled = update_data.is_ai_enabled
    if update_data.rtsp_url is not None:
        camera.rtsp_url = update_data.rtsp_url

    db.commit()
    db.refresh(camera)

    audit_service.log(
        db=db,
        username=current_user.username,
        role=current_user.role,
        action="UPDATE_CAMERA",
        resource=f"/api/cameras/{camera_id}",
        details=update_data.model_dump(exclude_none=True)
    )
    return camera
