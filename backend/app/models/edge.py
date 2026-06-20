import uuid
from datetime import datetime
from typing import Optional, TYPE_CHECKING
from sqlmodel import SQLModel, Field, Relationship

if TYPE_CHECKING:
    from app.models.board import Board


class EdgeBase(SQLModel):
    source_node_id: uuid.UUID = Field(foreign_key="nodes.id")
    target_node_id: uuid.UUID = Field(foreign_key="nodes.id")
    color: str = Field(default="#c0392b", max_length=7)  # thread color (red yarn default)
    label: Optional[str] = Field(default=None, max_length=100)


class Edge(EdgeBase, table=True):
    """
    A yarn string connecting two nodes on a corkboard.
    Rendered as a Bézier catenary curve in the canvas engine.
    """
    __tablename__ = "edges"

    id: Optional[uuid.UUID] = Field(default_factory=uuid.uuid4, primary_key=True)
    board_id: uuid.UUID = Field(foreign_key="boards.id", index=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)

    # Relationship
    board: Optional["Board"] = Relationship(back_populates="edges")
