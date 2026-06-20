from typing import List
from uuid import UUID
from sqlmodel import Session
from fastapi import HTTPException, status

from app.models.edge import Edge
from app.models.user import User
from app.repositories.edge_repository import EdgeRepository
from app.services.board_service import BoardService
from app.schemas.edge import EdgeCreate, EdgeUpdate


class EdgeService:
    """Business logic layer for edge (yarn string) management."""

    def __init__(self, session: Session) -> None:
        self.edge_repo = EdgeRepository(session)
        self.board_service = BoardService(session)

    def get_board_edges(self, board_id: UUID, owner: User) -> List[Edge]:
        """Return all edges on a board the user has access to."""
        self.board_service.get_board(board_id, owner)
        return self.edge_repo.get_by_board(board_id)

    def create_edge(self, board_id: UUID, payload: EdgeCreate, owner: User) -> Edge:
        """Connect two nodes with a yarn string. Verifies board ownership first."""
        self.board_service.get_board(board_id, owner)
        edge = Edge(**payload.model_dump(), board_id=board_id)
        return self.edge_repo.create(edge)

    def update_edge(self, board_id: UUID, edge_id: UUID, payload: EdgeUpdate, owner: User) -> Edge:
        """Update a yarn string's color or label."""
        self.board_service.get_board(board_id, owner)
        edge = self.edge_repo.get(edge_id)
        if not edge or edge.board_id != board_id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Edge not found")
        update_data = payload.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(edge, key, value)
        return self.edge_repo.update(edge)

    def delete_edge(self, board_id: UUID, edge_id: UUID, owner: User) -> None:
        """Remove a yarn string connection."""
        self.board_service.get_board(board_id, owner)
        edge = self.edge_repo.get(edge_id)
        if not edge or edge.board_id != board_id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Edge not found")
        self.edge_repo.delete(edge)
