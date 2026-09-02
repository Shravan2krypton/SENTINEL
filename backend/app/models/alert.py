from datetime import datetime, timezone
from sqlalchemy import Column, String, Float, Text, DateTime, ForeignKey, Index
from sqlalchemy.orm import relationship
from app.core.database import Base

class Alert(Base):
    __tablename__ = "alerts"

    id = Column(String(64), primary_key=True, index=True)
    alert_type = Column(String(50), default="WATCHLIST_HIT", index=True)
    severity = Column(String(20), default="HIGH", index=True)  # CRITICAL, HIGH, MEDIUM, LOW
    plate_number = Column(String(30), nullable=False, index=True)
    watchlist_id = Column(String(64), ForeignKey("watchlist_entries.id"), nullable=True)
    camera_id = Column(String(100), ForeignKey("cameras.id"), nullable=False, index=True)
    timestamp_pts = Column(DateTime(timezone=True), nullable=False, index=True)
    confidence = Column(Float, nullable=False)
    evidence_url = Column(String(500), nullable=True)
    status = Column(String(30), default="ACTIVE", index=True)  # ACTIVE, ACKNOWLEDGED, RESOLVED, DISMISSED
    assigned_user = Column(String(100), nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True)
    acknowledged_at = Column(DateTime(timezone=True), nullable=True)
    resolved_at = Column(DateTime(timezone=True), nullable=True)

    camera = relationship("Camera")
    watchlist_entry = relationship("WatchlistEntry")

    __table_args__ = (
        Index("idx_alert_status_created", "status", "created_at"),
    )
