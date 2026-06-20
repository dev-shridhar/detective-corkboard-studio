import bcrypt
from datetime import datetime, timedelta
import hashlib
from typing import Optional

from jose import JWTError, jwt
from fastapi import HTTPException, status
from fastapi.security import OAuth2PasswordBearer

from app.core.config import settings


# OAuth2 token scheme — points to the login endpoint
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


class SecurityUtils:
    """
    Utility class for password hashing and JWT token operations.
    All security primitives live here — not scattered across service files.
    """

    @staticmethod
    def hash_token(token: str) -> str:
        """Hash an API/refresh token using SHA-256."""
        return hashlib.sha256(token.encode()).hexdigest()

    @staticmethod
    def verify_token(token: str, hashed_token: str) -> bool:
        """Verify an API/refresh token against its SHA-256 hash."""
        return SecurityUtils.hash_token(token) == hashed_token

    @staticmethod
    def hash_password(plain_password: str) -> str:
        """Hash a plain-text password using bcrypt directly."""
        password_bytes = plain_password.encode("utf-8")
        salt = bcrypt.gensalt()
        hashed = bcrypt.hashpw(password_bytes, salt)
        return hashed.decode("utf-8")

    @staticmethod
    def verify_password(plain_password: str, hashed_password: str) -> bool:
        """Verify a plain-text password against a stored bcrypt hash directly."""
        try:
            password_bytes = plain_password.encode("utf-8")
            hashed_bytes = hashed_password.encode("utf-8")
            return bcrypt.checkpw(password_bytes, hashed_bytes)
        except Exception:
            return False

    @staticmethod
    def create_access_token(subject: str, expires_delta: Optional[timedelta] = None) -> str:
        """
        Create a signed JWT access token.
        subject: typically the user's UUID as a string.
        """
        import uuid
        expire = datetime.utcnow() + (
            expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        )
        payload = {
            "sub": subject,
            "exp": expire,
            "type": "access",
            "jti": str(uuid.uuid4()),
        }
        return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

    @staticmethod
    def create_refresh_token(subject: str) -> str:
        """Create a longer-lived JWT refresh token."""
        import uuid
        expire = datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
        payload = {
            "sub": subject,
            "exp": expire,
            "type": "refresh",
            "jti": str(uuid.uuid4()),
        }
        return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

    @staticmethod
    def decode_token(token: str) -> dict:
        """
        Decode and validate a JWT token.
        Raises HTTPException 401 on any failure.
        """
        try:
            return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        except JWTError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Could not validate credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )
