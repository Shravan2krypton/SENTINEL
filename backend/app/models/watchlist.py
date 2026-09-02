from datetime import datetime, timezone
from sqlalchemy import Column, String, Text, DateTime, Index
from app.core.database import Base

class WatchlistEntry(Base):
    __tablename__ = "watchlist_entries"

    id = Column(String(64), primary_key=True, index=True)
    plate_number = Column(String(30), nullable=False, unique=True, index=True)  # Normalized (e.g. GJ06AB1234)
    category = Column(String(50), nullable=False, index=True)                   # stolen, wanted, investigation, custom
    priority = Column(String(20), default="HIGH", index=True)                   # CRITICAL, HIGH, MEDIUM, LOW
    description = Column(Text, nullable=False)
    vehicle_make_model = Column(String(100), nullable=True)
    owner_name = Column(String(150), nullable=True)
    case_number = Column(String(100), nullable=True)
    status = Column(String(20), default="ACTIVE", index=True)                  # ACTIVE, INACTIVE, EXPIRED
    created_by = Column(String(100), default="system")
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    expires_at = Column(DateTime(timezone=True), nullable=True)

    __table_args__ = (
        Index("idx_watchlist_plate_status", "plate_number", "status"),
    )
