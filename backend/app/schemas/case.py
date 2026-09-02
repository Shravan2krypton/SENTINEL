from pydantic import BaseModel, ConfigDict
from typing import List, Optional, Dict, Any
from datetime import datetime

class CaseCreate(BaseModel):
    case_number: Optional[str] = None
    title: str
    description: Optional[str] = None
    target_plate: Optional[str] = None
    investigating_officer: str
    department: str = "Gujarat CID Crime Branch"
    priority: str = "HIGH"
    notes: Optional[str] = None

class CaseUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    target_plate: Optional[str] = None
    status: Optional[str] = None # OPEN, UNDER_INVESTIGATION, RESOLVED, CLOSED
    priority: Optional[str] = None
    notes: Optional[str] = None

class AddEvidenceRequest(BaseModel):
    detection_id: Optional[str] = None
    camera_id: str
    camera_location: Optional[str] = None
    plate_number: Optional[str] = None
    timestamp_pts: Optional[str] = None
    confidence: Optional[str] = "0.95"
    evidence_type: str = "OBSERVED_CCTV"
    evidence_url: Optional[str] = None
    notes: Optional[str] = None

class CaseEvidenceOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    case_id: str
    detection_id: Optional[str] = None
    camera_id: str
    camera_location: Optional[str] = None
    plate_number: Optional[str] = None
    timestamp_pts: datetime
    confidence: Optional[str] = None
    evidence_type: str
    evidence_url: Optional[str] = None
    metadata_payload: Optional[Dict[str, Any]] = None
    added_by: str
    added_at: datetime

class CaseOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    case_number: str
    title: str
    description: Optional[str] = None
    target_plate: Optional[str] = None
    investigating_officer: str
    department: str
    status: str
    priority: str
    notes: Optional[str] = None
    created_by: str
    created_at: datetime
    updated_at: datetime
    evidence_items: List[CaseEvidenceOut] = []
