from typing import List
from uuid import UUID
from sqlmodel import Session, select

from app.models.node import Node
from app.repositories.base import BaseRepository


class NodeRepository(BaseRepository[Node]):
    """Data access layer for Node (tile) records."""

    def __init__(self, session: Session) -> None:
        super().__init__(Node, session)

    def get_by_board(self, board_id: UUID) -> List[Node]:
        """Fetch all nodes belonging to a specific board."""
        statement = select(Node).where(Node.board_id == board_id)
        return self.session.exec(statement).all()
