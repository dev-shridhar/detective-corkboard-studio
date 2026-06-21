import uuid
from datetime import datetime
from typing import Optional, List, TYPE_CHECKING
from sqlmodel import SQLModel, Field, Relationship

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.node import Node
    from app.models.edge import Edge


class BoardBase(SQLModel):
    name: str = Field(min_length=1, max_length=100)
    description: Optional[str] = Field(default=None, max_length=500)
    is_public: bool = Field(default=False)
    view_x: Optional[float] = Field(default=None)
    view_y: Optional[float] = Field(default=None)
    view_zoom: Optional[float] = Field(default=None)


class Board(BoardBase, table=True):
    """
    A single corkboard workspace.
    Each board belongs to one owner and contains many nodes and edges.
    """
    __tablename__ = "boards"

    id: Optional[uuid.UUID] = Field(default_factory=uuid.uuid4, primary_key=True)
    owner_id: uuid.UUID = Field(foreign_key="users.id", index=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    # Relationships
    owner: Optional["User"] = Relationship(back_populates="boards")
    nodes: List["Node"] = Relationship(back_populates="board")
    edges: List["Edge"] = Relationship(back_populates="board")
