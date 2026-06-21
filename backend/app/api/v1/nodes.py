from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends, status
from sqlmodel import Session

from app.core.database import get_session
from app.core.security import get_current_user
from app.services.node_service import NodeService
from app.schemas.node import NodeCreate, NodeUpdate, NodeRead

router = APIRouter()


@router.get("/{board_id}/nodes", response_model=List[NodeRead])
def list_nodes(board_id: UUID, current_user=Depends(get_current_user), session: Session = Depends(get_session)):
    """List all tiles on a board."""
    return NodeService(session).get_board_nodes(board_id, current_user)


@router.post("/{board_id}/nodes", response_model=NodeRead, status_code=status.HTTP_201_CREATED)
def create_node(board_id: UUID, payload: NodeCreate, current_user=Depends(get_current_user), session: Session = Depends(get_session)):
    """Add a new tile to the board."""
    return NodeService(session).create_node(board_id, payload, current_user)


@router.patch("/{board_id}/nodes/{node_id}", response_model=NodeRead)
def update_node(board_id: UUID, node_id: UUID, payload: NodeUpdate, current_user=Depends(get_current_user), session: Session = Depends(get_session)):
    """Update a tile's position, shape, or content."""
    return NodeService(session).update_node(board_id, node_id, payload, current_user)


@router.delete("/{board_id}/nodes/{node_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_node(board_id: UUID, node_id: UUID, current_user=Depends(get_current_user), session: Session = Depends(get_session)):
    """Remove a tile from the board."""
    NodeService(session).delete_node(board_id, node_id, current_user)
