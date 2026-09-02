from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, DateTime, JSON, Index
from app.core.database import Base

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    username = Column(String(50), nullable=False, index=True)
    role = Column(String(30), nullable=False)
    action = Column(String(50), nullable=False, index=True)
    resource = Column(String(200), nullable=False)
    result = Column(String(20), default="SUCCESS")  # SUCCESS, FAILED, DENIED
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(String(255), nullable=True)
    details = Column(JSON, default=dict)
    timestamp = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True)

    __table_args__ = (
        Index("idx_audit_action_time", "action", "timestamp"),
        Index("idx_audit_user_time", "username", "timestamp"),
    )
