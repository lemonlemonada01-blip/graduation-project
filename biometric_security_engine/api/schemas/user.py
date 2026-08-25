from pydantic import BaseModel
from typing import Optional, List

class UserCreate(BaseModel):
    full_name: str
    email: str
    password: str
    role: str = "Student"
    university: Optional[str] = None
    department: Optional[str] = None
    status: Optional[str] = "Active"

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[str] = None
    role: Optional[str] = None
    university: Optional[str] = None
    department: Optional[str] = None
    status: Optional[str] = None

class UserStatusUpdate(BaseModel):
    status: str

class UserResponse(BaseModel):
    id: int
    name: str
    email: str
    role: str
    uni: str
    dept: str
    status: str
    created_at: Optional[str] = None

class UserList(BaseModel):
    users: List[UserResponse]

class PasswordChangePayload(BaseModel):
    email: Optional[str] = None
    current_password: str
    new_password: str
