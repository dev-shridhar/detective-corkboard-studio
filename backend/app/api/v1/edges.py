from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends, status, HTTPException
from sqlmodel import Session

from app.core.database import get_session
from app.core.security import get_current_user
from app.services.edge_service import EdgeService
from app.schemas.edge import EdgeCreate, EdgeUpdate, EdgeRead

router = APIRouter()


@router.get("/{board_id}/edges", response_model=List[EdgeRead])
def list_edges(board_id: UUID, current_user=Depends(get_current_user), session: Session = Depends(get_session)):
    """List all yarn string connections on a board."""
    return EdgeService(session).get_board_edges(board_id, current_user)


@router.post("/{board_id}/edges", response_model=EdgeRead, status_code=status.HTTP_201_CREATED)
def create_edge(board_id: UUID, payload: EdgeCreate, current_user=Depends(get_current_user), session: Session = Depends(get_session)):
    """Connect two tiles with a yarn string."""
    return EdgeService(session).create_edge(board_id, payload, current_user)


@router.patch("/{board_id}/edges/{edge_id}", response_model=EdgeRead)
def update_edge(board_id: UUID, edge_id: UUID, payload: EdgeUpdate, current_user=Depends(get_current_user), session: Session = Depends(get_session)):
    """Update a yarn string's color or label."""
    return EdgeService(session).update_edge(board_id, edge_id, payload, current_user)


@router.delete("/{board_id}/edges/{edge_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_edge(board_id: UUID, edge_id: UUID, current_user=Depends(get_current_user), session: Session = Depends(get_session)):
    """Remove a yarn string connection."""
    EdgeService(session).delete_edge(board_id, edge_id, current_user)
