from typing import Optional
from sqlmodel import Session, select

from app.models.user import User
from app.repositories.base import BaseRepository


class UserRepository(BaseRepository[User]):
    """
    Data access layer for User records.
    Extends BaseRepository with user-specific query methods.
    """

    def __init__(self, session: Session) -> None:
        super().__init__(User, session)

    def get_by_username(self, username: str) -> Optional[User]:
        """Fetch a user by their unique username."""
        statement = select(User).where(User.username == username)
        return self.session.exec(statement).first()

    def get_by_email(self, email: str) -> Optional[User]:
        """Fetch a user by their unique email address."""
        statement = select(User).where(User.email == email)
        return self.session.exec(statement).first()
