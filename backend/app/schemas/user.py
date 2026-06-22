from pydantic import BaseModel, EmailStr, Field
import uuid
from datetime import datetime


class UserCreate(BaseModel):
    username: str = Field(
        min_length=3,
        max_length=50,
        pattern=r"^[a-zA-Z0-9_-]+$",
        description="Username must be 3-50 characters long and contain only letters, numbers, underscores, or hyphens."
    )
    email: EmailStr
    password: str = Field(min_length=6, max_length=100)


class UserRead(BaseModel):
    id: uuid.UUID
    username: str
    email: str
    is_active: bool
    is_verified: bool
    created_at: datetime


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class EmailVerifyRequest(BaseModel):
    username_or_email: str
    code: str = Field(min_length=6, max_length=6, pattern=r"^\d{6}$")


class ResendVerificationRequest(BaseModel):
    username_or_email: str


class UserSettingsUpdate(BaseModel):
    theme: Optional[str] = None
    yarn: Optional[str] = None
    bar: Optional[str] = None

