from pydantic import BaseModel
from typing import Optional, List
from enum import Enum
import uuid
from datetime import datetime


class NodeShape(str, Enum):
    NOTE_CARD = "note_card"
    TAPE_LABEL = "tape_label"
    POLAROID = "polaroid"
    NEWSPAPER_CLIPPING = "newspaper_clipping"


class NodeCreate(BaseModel):
    id: Optional[uuid.UUID] = None
    title: str
    description: Optional[str] = None
    shape: NodeShape = NodeShape.NOTE_CARD
    color: str = "#f5e6c8"
    x: float = 0.0
    y: float = 0.0
    concepts: Optional[List[str]] = None
    links: Optional[List[dict]] = None


class NodeUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    shape: Optional[NodeShape] = None
    color: Optional[str] = None
    x: Optional[float] = None
    y: Optional[float] = None
    concepts: Optional[List[str]] = None
    links: Optional[List[dict]] = None


class NodeRead(BaseModel):
    id: uuid.UUID
    board_id: uuid.UUID
    title: str
    description: Optional[str]
    shape: NodeShape
    color: str
    x: float
    y: float
    concepts: Optional[List[str]]
    links: Optional[List[dict]]
    created_at: datetime
