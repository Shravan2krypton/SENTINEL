from datetime import datetime, timezone
from sqlalchemy import Column, String, Text, DateTime, ForeignKey, Enum, JSON
from sqlalchemy.orm import relationship
from app.core.database import Base

class Case(Base):
    __tablename__ = "cases"

    id = Column(String(64), primary_key=True, index=True)
    case_number = Column(String(100), unique=True, nullable=False, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    target_plate = Column(String(30), nullable=True, index=True)
    investigating_officer = Column(String(150), nullable=False)
    department = Column(String(100), nullable=False)
    status = Column(String(30), default="OPEN", index=True) # OPEN, UNDER_INVESTIGATION, RESOLVED, CLOSED
    priority = Column(String(20), default="HIGH")          # CRITICAL, HIGH, MEDIUM, LOW
    notes = Column(Text, nullable=True)
    created_by = Column(String(100), default="system")
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    evidence_items = relationship("CaseEvidence", back_populates="case", cascade="all, delete-orphan")

class CaseEvidence(Base):
    __tablename__ = "case_evidence"

    id = Column(String(64), primary_key=True, index=True)
    case_id = Column(String(64), ForeignKey("cases.id", ondelete="CASCADE"), nullable=False, index=True)
    detection_id = Column(String(64), nullable=True, index=True)
    camera_id = Column(String(64), nullable=False, index=True)
    camera_location = Column(String(255), nullable=True)
    plate_number = Column(String(30), nullable=True)
    timestamp_pts = Column(DateTime(timezone=True), nullable=False)
    confidence = Column(String(20), nullable=True)
    evidence_type = Column(String(50), default="OBSERVED_CCTV") # OBSERVED_CCTV, INFERRED_TRANSIT, OFFICER_NOTE
    evidence_url = Column(String(500), nullable=True)
    metadata_payload = Column(JSON, nullable=True)
    added_by = Column(String(100), default="system")
    added_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    case = relationship("Case", back_populates="evidence_items")
