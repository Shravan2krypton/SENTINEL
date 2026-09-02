from datetime import datetime, timezone
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import verify_password, create_access_token, decode_access_token, hash_password
from app.models.user import User
from app.schemas.auth import LoginRequest, Token, UserOut, UserCreate
from app.services.audit_service import audit_service

router = APIRouter(prefix="/auth", tags=["Authentication & RBAC"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
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
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied: Required role in {allowed_roles}, your role is {current_user.role}"
            )
        return current_user
    return role_checker

@router.post("/login", response_model=Token)
async def login(request: Request, login_data: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == login_data.username).first()
    ip_addr = request.client.host if request.client else "unknown"

    if not user or not verify_password(login_data.password, user.hashed_password):
        audit_service.log(
            db=db,
            username=login_data.username,
            role="UNKNOWN",
            action="LOGIN_FAILED",
            resource="/api/auth/login",
            result="FAILED",
            ip_address=ip_addr
        )
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect username or password")

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
