from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel

class ANPRDetectionCreate(BaseModel):
    camera_id: str
    plate_raw: str
    plate_normalized: str
    confidence: float
    timestamp_pts: datetime
    vehicle_class: str = "car"
    track_id: Optional[int] = None
    bbox: List[float]
    evidence_reference: Optional[str] = None

class ANPRDetectionOut(BaseModel):
    id: str
    camera_id: str
    camera_name: Optional[str] = None
    location_name: Optional[str] = None
    district: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    plate_raw: str
    plate_normalized: str
    confidence: float
    timestamp_pts: datetime
    vehicle_class: str
    track_id: Optional[int] = None
    bbox: List[float]
    evidence_reference: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class VehicleSearchQuery(BaseModel):
    plate: str
    district: Optional[str] = None
    camera_id: Optional[str] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    min_confidence: Optional[float] = 0.5
    limit: int = 50
