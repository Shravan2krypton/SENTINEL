from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel

class CameraBase(BaseModel):
    id: str
    name: str
    department_id: Optional[str] = None
    location_name: str
    district: str
    latitude: float
    longitude: float
    codec: str
    resolution: str
    reported_fps: float
    bitrate_kbps: int
    rtsp_url: str
    hls_url: Optional[str] = None
    whep_url: Optional[str] = None
    status: str
    is_ai_enabled: bool = True
    capabilities: Optional[Dict[str, Any]] = None
    location_source: Optional[str] = "SOURCE-PROVIDED LOCATION"

class CameraOut(CameraBase):
    last_heartbeat: Optional[datetime] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class CameraHealthOut(BaseModel):
    camera_id: str
    status: str
    latency_ms: float
    packet_loss_pct: float
    actual_fps: float
    reconnect_attempts: int
    error_message: Optional[str] = None
    timestamp: datetime

    class Config:
        from_attributes = True

class CameraUpdate(BaseModel):
    name: Optional[str] = None
    status: Optional[str] = None
    is_ai_enabled: Optional[bool] = None
    rtsp_url: Optional[str] = None
