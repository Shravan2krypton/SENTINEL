from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, field_validator

class SentinelCameraItem(BaseModel):
    camera_id: str = Field(..., description="Unique hardware or VMS camera identifier")
    name: str = Field(..., description="Descriptive camera identifier / landmark")
    location: str = Field(..., description="Human-readable physical location")
    district: Optional[str] = Field("Vadodara", description="Gujarat administrative district")
    department_id: Optional[str] = Field(None, description="Owning agency or department")
    latitude: float = Field(..., ge=-90.0, le=90.0, description="WGS84 latitude")
    longitude: float = Field(..., ge=-180.0, le=180.0, description="WGS84 longitude")
    codec: str = Field("H264", description="Video compression format: H264 or H265")
    resolution: str = Field("1920x1080", description="Frame resolution")
    reported_fps: float = Field(25.0, gt=0, le=120, description="Reported frame rate")
    bitrate_kbps: Optional[int] = Field(2048, ge=64, le=50000)
    live_status: str = Field("ONLINE", description="ONLINE, OFFLINE, DEGRADED, RECONNECTING")
    rtsp_url: str = Field(..., description="Primary RTSP stream URI")
    hls_url: Optional[str] = Field(None, description="HLS stream URL if available")
    whep_url: Optional[str] = Field(None, description="WHEP WebRTC URL if available")
    stream_properties: Dict[str, Any] = Field(default_factory=dict)
    capabilities: Dict[str, Any] = Field(default_factory=dict)

    @field_validator("codec")
    @classmethod
    def validate_codec(cls, v: str) -> str:
        v_upper = v.upper().replace(".", "").replace("-", "")
        if "265" in v_upper or "HEVC" in v_upper:
            return "H265"
        return "H264"

class SentinelCatalogueResponse(BaseModel):
    gateway_id: str = Field(default="SENTINEL_GRID_GUJARAT_GW01")
    timestamp: str
    total_cameras: int
    cameras: List[SentinelCameraItem]
