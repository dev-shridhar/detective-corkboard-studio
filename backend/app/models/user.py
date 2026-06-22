import uuid
from datetime import datetime
from typing import Optional, List, TYPE_CHECKING
from sqlmodel import SQLModel, Field, Relationship, Column
from sqlalchemy import JSON

if TYPE_CHECKING:
    from app.models.board import Board


class UserBase(SQLModel):
    username: str = Field(unique=True, index=True, min_length=3, max_length=50)
    email: str = Field(unique=True, index=True)


class User(UserBase, table=True):
    """
    Persistent User record.
    Passwords are stored as bcrypt hashes — never plain text.
    """
    __tablename__ = "users"

    id: Optional[uuid.UUID] = Field(default_factory=uuid.uuid4, primary_key=True)
    hashed_password: str
    hashed_refresh_token: Optional[str] = Field(default=None, nullable=True)
    is_active: bool = Field(default=True)
    is_verified: bool = Field(default=False)
    verification_code: Optional[str] = Field(default=None, nullable=True)
    verification_code_expires_at: Optional[datetime] = Field(default=None, nullable=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    settings: dict = Field(
        default={"theme": "light", "yarn": "above", "bar": "horizontal"},
        sa_column=Column(JSON)
    )

    # One user → many boards
    boards: List["Board"] = Relationship(back_populates="owner")
