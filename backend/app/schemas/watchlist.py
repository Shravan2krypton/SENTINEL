from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field

class WatchlistCreate(BaseModel):
    plate_number: str = Field(..., description="Target vehicle registration (e.g. GJ06AB1234)")
    category: str = Field("wanted", description="stolen, wanted, investigation, custom")
    priority: str = Field("HIGH", description="CRITICAL, HIGH, MEDIUM, LOW")
    description: str = Field(..., description="Reason for watchlist flag and case notes")
    vehicle_make_model: Optional[str] = None
    owner_name: Optional[str] = None
    case_number: Optional[str] = None
    expires_at: Optional[datetime] = None

class WatchlistUpdate(BaseModel):
    category: Optional[str] = None
    priority: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    expires_at: Optional[datetime] = None

class WatchlistOut(BaseModel):
    id: str
    plate_number: str
    category: str
    priority: str
    description: str
    vehicle_make_model: Optional[str] = None
    owner_name: Optional[str] = None
    case_number: Optional[str] = None
    status: str
    created_by: str
    created_at: datetime
    expires_at: Optional[datetime] = None

    class Config:
        from_attributes = True
