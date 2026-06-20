from pydantic import BaseModel, EmailStr
import uuid
from datetime import datetime


class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str


class UserRead(BaseModel):
    id: uuid.UUID
    username: str
    email: str
    is_active: bool
    created_at: datetime


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"

