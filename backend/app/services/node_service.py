from typing import List
from uuid import UUID
from sqlmodel import Session
from fastapi import HTTPException, status

from app.models.node import Node
from app.models.user import User
from app.repositories.node_repository import NodeRepository
from app.services.board_service import BoardService
from app.schemas.node import NodeCreate, NodeUpdate


class NodeService:
    """Business logic layer for node (tile) management."""

    def __init__(self, session: Session) -> None:
        self.node_repo = NodeRepository(session)
        self.board_service = BoardService(session)

    def get_board_nodes(self, board_id: UUID, owner: User) -> List[Node]:
        """Return all nodes on a board the user has access to."""
        self.board_service.get_board(board_id, owner)  # enforces access check
        return self.node_repo.get_by_board(board_id)

    def create_node(self, board_id: UUID, payload: NodeCreate, owner: User) -> Node:
        """Create a new tile on the board. Verifies board ownership first."""
        board = self.board_service.get_board(board_id, owner)
        from datetime import datetime
        board.updated_at = datetime.utcnow()
        self.board_service.board_repo.update(board)

        node_data = payload.model_dump()
        if node_data.get("id") is None:
            node_data.pop("id", None)
        node = Node(**node_data, board_id=board_id)
        return self.node_repo.create(node)

    def update_node(self, board_id: UUID, node_id: UUID, payload: NodeUpdate, owner: User) -> Node:
        """Update a node's position, shape, or content."""
        board = self.board_service.get_board(board_id, owner)
        from datetime import datetime
        board.updated_at = datetime.utcnow()
        self.board_service.board_repo.update(board)

        node = self.node_repo.get(node_id)
        if not node or node.board_id != board_id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Node not found")
        update_data = payload.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(node, key, value)
        return self.node_repo.update(node)

    def delete_node(self, board_id: UUID, node_id: UUID, owner: User) -> None:
        """Delete a tile from the board."""
        board = self.board_service.get_board(board_id, owner)
        from datetime import datetime
        board.updated_at = datetime.utcnow()
        self.board_service.board_repo.update(board)

        node = self.node_repo.get(node_id)
        if not node or node.board_id != board_id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Node not found")
        
        # Cascade delete connected edges from database first
        from app.models.edge import Edge
        from sqlmodel import select
        session = self.node_repo.session
        connected_edges = session.exec(
            select(Edge).where(
                (Edge.board_id == board_id) &
                ((Edge.source_node_id == node_id) | (Edge.target_node_id == node_id))
            )
        ).all()
        for edge in connected_edges:
            session.delete(edge)
        
        self.node_repo.delete(node)
