from datetime import datetime
from typing import Optional
from pydantic import BaseModel

class AlertCreate(BaseModel):
    alert_type: str = "WATCHLIST_HIT"
    severity: str = "HIGH"
    plate_number: str
    watchlist_id: Optional[str] = None
    camera_id: str
    timestamp_pts: datetime
    confidence: float
    evidence_url: Optional[str] = None
    notes: Optional[str] = None

class AlertOut(BaseModel):
    id: str
    alert_type: str
    severity: str
    plate_number: str
    watchlist_id: Optional[str] = None
    camera_id: str
    camera_name: Optional[str] = None
    location_name: Optional[str] = None
    district: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    timestamp_pts: datetime
    confidence: float
    evidence_url: Optional[str] = None
    status: str
    assigned_user: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime
    acknowledged_at: Optional[datetime] = None
    resolved_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class AlertStatusUpdate(BaseModel):
    status: str  # ACKNOWLEDGED, RESOLVED, DISMISSED
    notes: Optional[str] = None
