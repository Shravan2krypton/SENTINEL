from typing import Optional
from pydantic import BaseModel, EmailStr

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    username: str
    full_name: str
    department: str

class LoginRequest(BaseModel):
    username: str
    password: str

class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str
    full_name: str
    badge_number: Optional[str] = None
    department: Optional[str] = "Gujarat Police / Traffic Branch"
    role: str = "Operator"

class UserOut(BaseModel):
    id: str
    username: str
    email: str
    full_name: str
    badge_number: Optional[str] = None
    department: str
    role: str
    is_active: bool

    class Config:
        from_attributes = True
