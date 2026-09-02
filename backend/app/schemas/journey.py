from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel

class JourneyStep(BaseModel):
    step_number: int
    step_type: str  # "OBSERVED_DETECTION" or "INFERRED_TRANSIT"
    timestamp: datetime
    camera_id: Optional[str] = None
    camera_name: Optional[str] = None
    location_name: str
    district: str
    latitude: float
    longitude: float
    confidence: Optional[float] = None
    evidence_url: Optional[str] = None
    vehicle_class: Optional[str] = None
    
    # Inferred transit metrics (only present for INFERRED_TRANSIT steps)
    distance_km: Optional[float] = None
    duration_minutes: Optional[float] = None
    estimated_speed_kmh: Optional[float] = None
    corridor_name: Optional[str] = None
    observation_notes: Optional[str] = None

class VehicleJourneyResponse(BaseModel):
    plate_number: str
    total_detections: int
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    districts_traversed: List[str]
    total_estimated_distance_km: float
    is_watchlist_hit: bool = False
    watchlist_category: Optional[str] = None
    steps: List[JourneyStep]
    observed_points: List[List[float]]  # [[lat, lon], ...]
    inferred_polyline: List[List[float]] # [[lat, lon], ...]
