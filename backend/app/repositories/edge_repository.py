from typing import List
from uuid import UUID
from sqlmodel import Session, select

from app.models.edge import Edge
from app.repositories.base import BaseRepository


class EdgeRepository(BaseRepository[Edge]):
    """Data access layer for Edge (yarn string) records."""

    def __init__(self, session: Session) -> None:
        super().__init__(Edge, session)

    def get_by_board(self, board_id: UUID) -> List[Edge]:
        """Fetch all edges belonging to a specific board."""
        statement = select(Edge).where(Edge.board_id == board_id)
        return self.session.exec(statement).all()
