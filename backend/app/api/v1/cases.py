import uuid
from typing import List
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.api.v1.auth import require_roles, get_current_user
from app.models.case import Case, CaseEvidence
from app.schemas.case import CaseCreate, CaseUpdate, CaseOut, AddEvidenceRequest, CaseEvidenceOut

router = APIRouter(prefix="/cases", tags=["Case Management & Evidence (P1)"])

@router.get("", response_model=List[CaseOut])
def list_cases(
    status: str = Query(None),
    db: Session = Depends(get_db),
    current_user = Depends(require_roles(["ADMIN", "OPERATOR", "INVESTIGATOR", "VIEWER", "AUDITOR"]))
):
    query = db.query(Case)
    if status and status != "ALL":
        query = query.filter(Case.status == status)
    return query.order_by(Case.created_at.desc()).all()

@router.post("", response_model=CaseOut)
def create_case(
    payload: CaseCreate,
    db: Session = Depends(get_db),
    current_user = Depends(require_roles(["ADMIN", "OPERATOR", "INVESTIGATOR"]))
):
    case_num = payload.case_number or f"CASE-GJ-{datetime.now().strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"
    new_case = Case(
        id=f"case_{uuid.uuid4().hex[:12]}",
        case_number=case_num,
        title=payload.title,
        description=payload.description,
        target_plate=payload.target_plate,
        investigating_officer=payload.investigating_officer,
        department=payload.department,
        priority=payload.priority,
        notes=payload.notes,
        created_by=getattr(current_user, "username", "admin"),
        status="OPEN"
    )
    db.add(new_case)
    db.commit()
    db.refresh(new_case)
    return new_case

@router.get("/{case_id}", response_model=CaseOut)
def get_case(
    case_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(require_roles(["ADMIN", "OPERATOR", "INVESTIGATOR", "VIEWER", "AUDITOR"]))
):
    c = db.query(Case).filter(Case.id == case_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Case not found")
    return c

@router.patch("/{case_id}", response_model=CaseOut)
def update_case(
    case_id: str,
    payload: CaseUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(require_roles(["ADMIN", "OPERATOR", "INVESTIGATOR"]))
):
    c = db.query(Case).filter(Case.id == case_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Case not found")

    if payload.title is not None: c.title = payload.title
    if payload.description is not None: c.description = payload.description
    if payload.target_plate is not None: c.target_plate = payload.target_plate
    if payload.status is not None: c.status = payload.status
    if payload.priority is not None: c.priority = payload.priority
    if payload.notes is not None: c.notes = payload.notes

    db.commit()
    db.refresh(c)
    return c

@router.post("/{case_id}/evidence", response_model=CaseEvidenceOut)
def add_case_evidence(
    case_id: str,
    payload: AddEvidenceRequest,
    db: Session = Depends(get_db),
    current_user = Depends(require_roles(["ADMIN", "OPERATOR", "INVESTIGATOR"]))
):
    c = db.query(Case).filter(Case.id == case_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Case not found")

    ts = datetime.now(timezone.utc)
    if payload.timestamp_pts:
        try:
            ts = datetime.fromisoformat(payload.timestamp_pts)
        except Exception:
            pass

    evidence = CaseEvidence(
        id=f"ev_{uuid.uuid4().hex[:12]}",
        case_id=case_id,
        detection_id=payload.detection_id,
        camera_id=payload.camera_id,
        camera_location=payload.camera_location,
        plate_number=payload.plate_number,
        timestamp_pts=ts,
        confidence=payload.confidence,
        evidence_type=payload.evidence_type,
        evidence_url=payload.evidence_url,
        metadata_payload={"notes": payload.notes} if payload.notes else {},
        added_by=getattr(current_user, "username", "admin")
    )
    db.add(evidence)
    db.commit()
    db.refresh(evidence)
    return evidence
