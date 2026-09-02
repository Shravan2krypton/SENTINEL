import time
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse, Response
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.camera import Camera
from app.services.stream_manager import stream_manager
from app.core.logger import logger

router = APIRouter(prefix="/streams", tags=["Live Viewer & Streams"])

def frame_generator(camera_id: str, stream_url: str):
    worker = stream_manager.get_or_create_stream(camera_id, stream_url)
    while True:
        frame_bytes = worker.last_frame_bytes
        if frame_bytes:
            yield (b'--frame\r\n'
                   b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')
        time.sleep(0.04)  # ~25 FPS

@router.get("/{camera_id}/live")
async def get_live_stream(camera_id: str, db: Session = Depends(get_db)):
    """
    Unified Live Viewer Endpoint.
    Translates incoming RTSP/IP camera feeds into browser-compatible low-latency MJPEG stream.
    Displays real PTS timestamps and operational status on screen.
    """
    camera = db.query(Camera).filter(Camera.id == camera_id).first()
    if not camera:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Camera {camera_id} not found")

    return StreamingResponse(
        frame_generator(camera.id, camera.rtsp_url),
        media_type="multipart/x-mixed-replace; boundary=frame"
    )

@router.get("/{camera_id}/snapshot")
async def get_snapshot(camera_id: str, db: Session = Depends(get_db)):
    camera = db.query(Camera).filter(Camera.id == camera_id).first()
    if not camera:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Camera {camera_id} not found")

    worker = stream_manager.get_or_create_stream(camera.id, camera.rtsp_url)
    if worker.last_frame_bytes:
        return Response(content=worker.last_frame_bytes, media_type="image/jpeg")
    raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Stream frame not ready yet")

@router.get("/{camera_id}/status")
async def get_stream_status(camera_id: str, db: Session = Depends(get_db)):
    camera = db.query(Camera).filter(Camera.id == camera_id).first()
    if not camera:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Camera {camera_id} not found")

    worker = stream_manager.get_stream(camera_id)
    if not worker:
        return {
            "camera_id": camera_id,
            "state": "IDLE",
            "actual_fps": 0.0,
            "reconnect_attempts": 0,
            "pts": 0.0
        }
    return {
        "camera_id": camera_id,
        "state": worker.state,
        "actual_fps": worker.actual_fps,
        "reconnect_attempts": worker.reconnect_attempts,
        "pts": worker.last_pts
    }
