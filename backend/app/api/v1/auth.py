from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict, Tuple
from collections import defaultdict
from fastapi import APIRouter, Depends, HTTPException, status, Request, Query
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import verify_password, create_access_token, decode_access_token, hash_password
from app.core.config import settings
from app.models.user import User
from app.schemas.auth import LoginRequest, Token, UserOut, UserCreate
from app.services.audit_service import audit_service

router = APIRouter(prefix="/auth", tags=["Authentication & RBAC"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)

# SEC-012: In-memory brute-force protection store
# Key: (ip_address, username) → (failure_count, locked_until)
_login_attempts: Dict[str, Tuple[int, Optional[datetime]]] = defaultdict(lambda: (0, None))

def _check_lockout(ip: str, username: str) -> None:
    """Raise 429 if the IP+username combination is currently locked out."""
    key = f"{ip}:{username.lower()}"
    count, locked_until = _login_attempts.get(key, (0, None))
    if locked_until and datetime.now(timezone.utc) < locked_until:
        remaining = int((locked_until - datetime.now(timezone.utc)).total_seconds())
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Account temporarily locked due to repeated failed login attempts. "
                   f"Try again in {remaining} seconds.",
            headers={"Retry-After": str(remaining)}
        )

def _record_failure(ip: str, username: str) -> None:
    """Increment failure count; lock out if threshold exceeded."""
    key = f"{ip}:{username.lower()}"
    count, _ = _login_attempts.get(key, (0, None))
    count += 1
    if count >= settings.LOGIN_MAX_ATTEMPTS:
        locked_until = datetime.now(timezone.utc) + timedelta(seconds=settings.LOGIN_LOCKOUT_SECONDS)
        _login_attempts[key] = (count, locked_until)
    else:
        _login_attempts[key] = (count, None)

def _clear_failures(ip: str, username: str) -> None:
    """Clear failure record on successful authentication."""
    key = f"{ip}:{username.lower()}"
    _login_attempts.pop(key, None)

def get_current_user(
    header_token: Optional[str] = Depends(oauth2_scheme),
    query_token: Optional[str] = Query(None, alias="token"),
    db: Session = Depends(get_db)
) -> User:
    token = header_token or query_token
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    username = payload.get("sub")
    user = db.query(User).filter(User.username == username).first()
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found or disabled")
    return user

def require_roles(allowed_roles: List[str]):
    def role_checker(current_user: User = Depends(get_current_user)) -> User:
        user_role = (current_user.role or "").upper()
        allowed_upper = [r.upper() for r in allowed_roles]
        if user_role not in allowed_upper:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied: Required role in {allowed_roles}, your role is {current_user.role}"
            )
        return current_user
    return role_checker

@router.post("/login", response_model=Token)
async def login(request: Request, login_data: LoginRequest, db: Session = Depends(get_db)):
    ip_addr = request.client.host if request.client else "unknown"

    # SEC-012: Check lockout before any DB lookup
    _check_lockout(ip_addr, login_data.username)

    user = db.query(User).filter(User.username == login_data.username).first()

    if not user or not verify_password(login_data.password, user.hashed_password):
        # SEC-012: Record failed attempt
        _record_failure(ip_addr, login_data.username)
        audit_service.log(
            db=db,
            username=login_data.username,
            role="UNKNOWN",
            action="LOGIN_FAILED",
            resource="/api/auth/login",
            result="FAILED",
            ip_address=ip_addr
        )
        # Use a generic message to prevent user enumeration
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect username or password")

    # Successful login — clear failure record
    _clear_failures(ip_addr, login_data.username)
    user.last_login = datetime.now(timezone.utc)
    db.commit()

    token = create_access_token(subject=user.username, role=user.role)
    audit_service.log(
        db=db,
        username=user.username,
        role=user.role,
        action="LOGIN_SUCCESS",
        resource="/api/auth/login",
        result="SUCCESS",
        ip_address=ip_addr
    )

    return Token(
        access_token=token,
        token_type="bearer",
        role=user.role,
        username=user.username,
        full_name=user.full_name,
        department=user.department
    )

@router.get("/me", response_model=UserOut)
async def get_current_user_profile(current_user: User = Depends(get_current_user)):
    return current_user
