from typing import List
from uuid import UUID
from sqlmodel import Session, select

from app.models.board import Board
from app.repositories.base import BaseRepository


class BoardRepository(BaseRepository[Board]):
    """
    Data access layer for Board records.
    Extends BaseRepository with owner-scoped query methods.
    """

    def __init__(self, session: Session) -> None:
        super().__init__(Board, session)

    def get_by_owner(self, owner_id: UUID, offset: int = 0, limit: int = 50) -> List[Board]:
        """Fetch all boards owned by a specific user, paginated."""
        statement = (
            select(Board)
            .where(Board.owner_id == owner_id)
            .offset(offset)
            .limit(limit)
        )
        return self.session.exec(statement).all()

    def get_public_boards(self, offset: int = 0, limit: int = 50) -> List[Board]:
        """Fetch all boards marked as public."""
        statement = (
            select(Board)
            .where(Board.is_public == True)  # noqa: E712
            .offset(offset)
            .limit(limit)
        )
        return self.session.exec(statement).all()
