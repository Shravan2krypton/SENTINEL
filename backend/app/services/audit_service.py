from datetime import datetime, timezone
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from app.models.audit import AuditLog
from app.core.logger import logger

class AuditService:
    @staticmethod
    def log(
        db: Session,
        username: str,
        role: str,
        action: str,
        resource: str,
        result: str = "SUCCESS",
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None
    ) -> AuditLog:
        """
        Records append-only immutable audit trail entry.
        """
        audit_entry = AuditLog(
            username=username,
            role=role,
            action=action,
            resource=resource,
            result=result,
            ip_address=ip_address,
            user_agent=user_agent,
            details=details or {},
            timestamp=datetime.now(timezone.utc)
        )
        db.add(audit_entry)
        db.commit()
        logger.info(f"[AUDIT] {username} ({role}) -> {action} on {resource} [{result}]")
        return audit_entry

audit_service = AuditService()
