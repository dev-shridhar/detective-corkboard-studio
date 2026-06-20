from pydantic import BaseModel
from typing import Optional
import uuid
from datetime import datetime


class BoardCreate(BaseModel):
    name: str
    description: Optional[str] = None
    is_public: bool = False


class BoardUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    is_public: Optional[bool] = None


class BoardRead(BaseModel):
    id: uuid.UUID
    name: str
    description: Optional[str]
    is_public: bool
    owner_id: uuid.UUID
    created_at: datetime
    updated_at: datetime
