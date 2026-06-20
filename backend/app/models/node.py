import uuid
from datetime import datetime
from typing import Optional, List, TYPE_CHECKING
from enum import Enum
from sqlmodel import SQLModel, Field, Relationship, Column
from sqlalchemy import JSON

if TYPE_CHECKING:
    from app.models.board import Board


class NodeShape(str, Enum):
    """The visual shape/style of a tile on the corkboard."""
    NOTE_CARD = "note_card"
    TAPE_LABEL = "tape_label"
    POLAROID = "polaroid"
    NEWSPAPER_CLIPPING = "newspaper_clipping"


class NodeBase(SQLModel):
    title: str = Field(min_length=1, max_length=100)
    description: Optional[str] = Field(default=None)
    shape: NodeShape = Field(default=NodeShape.NOTE_CARD)
    color: str = Field(default="#f5e6c8", max_length=7)  # hex color
    x: float = Field(default=0.0)
    y: float = Field(default=0.0)


class Node(NodeBase, table=True):
    """
    A single draggable tile on a corkboard.
    Stores position, visual shape, content, and JSON metadata (concepts + links).
    """
    __tablename__ = "nodes"

    id: Optional[uuid.UUID] = Field(default_factory=uuid.uuid4, primary_key=True)
    board_id: uuid.UUID = Field(foreign_key="boards.id", index=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)

    # JSON columns for flexible content
    concepts: Optional[List[str]] = Field(default=None, sa_column=Column(JSON))
    links: Optional[List[dict]] = Field(default=None, sa_column=Column(JSON))

    # Relationship
    board: Optional["Board"] = Relationship(back_populates="nodes")
