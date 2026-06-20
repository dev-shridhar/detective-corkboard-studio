from typing import List
from uuid import UUID
from sqlmodel import Session
from fastapi import HTTPException, status

from app.models.board import Board
from app.models.user import User
from app.repositories.board_repository import BoardRepository
from app.schemas.board import BoardCreate, BoardUpdate


class BoardService:
    """
    Business logic layer for board management.
    Enforces ownership rules — users can only modify their own boards.
    """

    def __init__(self, session: Session) -> None:
        self.board_repo = BoardRepository(session)

    def get_user_boards(self, owner: User) -> List[Board]:
        """Return all boards owned by the current user."""
        return self.board_repo.get_by_owner(owner.id)

    def get_board(self, board_id: UUID, owner: User) -> Board:
        """
        Fetch a board by ID.
        Raises 404 if not found, 403 if not owned by the requesting user
        and the board is not public.
        """
        board = self.board_repo.get(board_id)
        if not board:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Board not found")
        if board.owner_id != owner.id and not board.is_public:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
        return board

    def create_board(self, payload: BoardCreate, owner: User) -> Board:
        """Create a new board for the current user."""
        board = Board(**payload.model_dump(), owner_id=owner.id)
        return self.board_repo.create(board)

    def update_board(self, board_id: UUID, payload: BoardUpdate, owner: User) -> Board:
        """Update a board's name or description. Owner only."""
        board = self.get_board(board_id, owner)
        if board.owner_id != owner.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
        update_data = payload.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(board, key, value)
        return self.board_repo.update(board)

    def delete_board(self, board_id: UUID, owner: User) -> None:
        """Delete a board. Owner only."""
        board = self.get_board(board_id, owner)
        if board.owner_id != owner.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
        self.board_repo.delete(board)
