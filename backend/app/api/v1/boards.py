from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends, status, HTTPException
from sqlmodel import Session

from app.core.database import get_session
from app.core.security import oauth2_scheme, SecurityUtils
from app.services.board_service import BoardService
from app.schemas.board import BoardCreate, BoardUpdate, BoardRead

router = APIRouter()


class TokenUser:
    def __init__(self, user_id: UUID):
        self.id = user_id


def get_current_user(token: str = Depends(oauth2_scheme)):
    payload = SecurityUtils.decode_token(token)
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token subject")
    try:
        return TokenUser(UUID(user_id))
    except ValueError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token subject UUID")


@router.get("", response_model=List[BoardRead])
def list_boards(current_user=Depends(get_current_user), session: Session = Depends(get_session)):
    """List all boards owned by the current user."""
    return BoardService(session).get_user_boards(current_user)


@router.post("", response_model=BoardRead, status_code=status.HTTP_201_CREATED)
def create_board(payload: BoardCreate, current_user=Depends(get_current_user), session: Session = Depends(get_session)):
    """Create a new blank board."""
    return BoardService(session).create_board(payload, current_user)


@router.get("/{board_id}", response_model=BoardRead)
def get_board(board_id: UUID, current_user=Depends(get_current_user), session: Session = Depends(get_session)):
    """Get a single board by ID."""
    return BoardService(session).get_board(board_id, current_user)


@router.patch("/{board_id}", response_model=BoardRead)
def update_board(board_id: UUID, payload: BoardUpdate, current_user=Depends(get_current_user), session: Session = Depends(get_session)):
    """Update a board's name or description."""
    return BoardService(session).update_board(board_id, payload, current_user)


@router.delete("/{board_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_board(board_id: UUID, current_user=Depends(get_current_user), session: Session = Depends(get_session)):
    """Delete a board permanently."""
    BoardService(session).delete_board(board_id, current_user)
