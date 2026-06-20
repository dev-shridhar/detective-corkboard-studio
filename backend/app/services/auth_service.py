from sqlmodel import Session
from fastapi import HTTPException, status

from app.models.user import User
from app.repositories.user_repository import UserRepository
from app.core.security import SecurityUtils
from app.schemas.user import UserCreate


class AuthService:
    """
    Business logic layer for user authentication.
    Handles registration, login verification, and token issuance.
    Never accesses the database directly — delegates to UserRepository.
    """

    def __init__(self, session: Session) -> None:
        self.user_repo = UserRepository(session)

    def register(self, payload: UserCreate) -> User:
        """
        Register a new user.
        Raises 409 if username or email already exists.
        """
        if self.user_repo.get_by_username(payload.username):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Username already taken",
            )
        if self.user_repo.get_by_email(payload.email):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Email already registered",
            )
        user = User(
            username=payload.username,
            email=payload.email,
            hashed_password=SecurityUtils.hash_password(payload.password),
        )
        return self.user_repo.create(user)

    def authenticate(self, username: str, password: str) -> User:
        """
        Verify username and password.
        Raises 401 on invalid credentials.
        """
        user = self.user_repo.get_by_username(username)
        if not user or not SecurityUtils.verify_password(password, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid username or password",
            )
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User account is disabled",
            )
        return user

    def get_current_user(self, token: str) -> User:
        """
        Decode a JWT access token and return the corresponding User.
        Raises 401 if token is invalid or user not found.
        """
        payload = SecurityUtils.decode_token(token)
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
        user = self.user_repo.get(user_id)
        if not user:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
        return user
