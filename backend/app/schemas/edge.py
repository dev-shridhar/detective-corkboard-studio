from pydantic import BaseModel
from typing import Optional
import uuid
from datetime import datetime


class EdgeCreate(BaseModel):
    source_node_id: uuid.UUID
    target_node_id: uuid.UUID
    color: str = "#c0392b"
    label: Optional[str] = None


class EdgeUpdate(BaseModel):
    color: Optional[str] = None
    label: Optional[str] = None


class EdgeRead(BaseModel):
    id: uuid.UUID
    board_id: uuid.UUID
    source_node_id: uuid.UUID
    target_node_id: uuid.UUID
    color: str
    label: Optional[str]
    created_at: datetime
