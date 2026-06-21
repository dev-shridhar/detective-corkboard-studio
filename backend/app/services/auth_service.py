from sqlmodel import Session
from fastapi import HTTPException, status, BackgroundTasks

from app.models.user import User
from app.repositories.user_repository import UserRepository
from app.core.security import SecurityUtils
from app.schemas.user import UserCreate
from app.services.email_service import EmailService


class AuthService:
    """
    Business logic layer for user authentication.
    Handles registration, login verification, and token issuance.
    Never accesses the database directly — delegates to UserRepository.
    """

    def __init__(self, session: Session) -> None:
        self.user_repo = UserRepository(session)

    def _generate_code(self) -> str:
        import random
        return f"{random.randint(0, 999999):06d}"

    def _hash_code(self, code: str) -> str:
        import hashlib
        return hashlib.sha256(code.encode()).hexdigest()

    def register(self, payload: UserCreate, background_tasks: BackgroundTasks) -> User:
        """
        Register a new user. Generates an email verification code.
        Raises 409 if username or email already exists.
        """
        username_clean = payload.username.strip().lower()
        email_clean = payload.email.strip().lower()

        if self.user_repo.get_by_username(username_clean):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Username already taken",
            )
        if self.user_repo.get_by_email(email_clean):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Email already registered",
            )

        user = User(
            username=username_clean,
            email=email_clean,
            hashed_password=SecurityUtils.hash_password(payload.password),
            is_verified=True,
            verification_code=None,
            verification_code_expires_at=None,
        )
        created_user = self.user_repo.create(user)

        # Trigger email sending in background (disabled)
        # background_tasks.add_task(EmailService.send_verification_email, email_clean, code)

        return created_user

    def authenticate(self, username: str, password: str) -> User:
        """
        Verify username and password (supports both username and email login).
        Raises 401 on invalid credentials.
        """
        username_clean = username.strip().lower()

        # Check if login is by email or username
        user = None
        if "@" in username_clean:
            user = self.user_repo.get_by_email(username_clean)
        
        if not user:
            user = self.user_repo.get_by_username(username_clean)

        if not user or not SecurityUtils.verify_password(password, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid username or password",
            )
        # Email verification check bypassed temporarily
        # if not user.is_verified:
        #     raise HTTPException(
        #         status_code=status.HTTP_403_FORBIDDEN,
        #         detail="Email not verified",
        #     )
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User account is disabled",
            )
        return user

    def verify_email(self, username_or_email: str, code: str) -> bool:
        """Verify the 6-digit email activation code."""
        clean_target = username_or_email.strip().lower()
        user = None
        if "@" in clean_target:
            user = self.user_repo.get_by_email(clean_target)
        if not user:
            user = self.user_repo.get_by_username(clean_target)

        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found",
            )
        if user.is_verified:
            return True

        if not user.verification_code or not user.verification_code_expires_at:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No verification code active for this user",
            )

        from datetime import datetime
        if datetime.utcnow() > user.verification_code_expires_at:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Verification code has expired",
            )

        hashed_input = self._hash_code(code)
        if user.verification_code != hashed_input:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid verification code",
            )

        user.is_verified = True
        user.verification_code = None
        user.verification_code_expires_at = None
        self.user_repo.update(user)
        return True

    def resend_verification(self, username_or_email: str, background_tasks: BackgroundTasks) -> None:
        """Generate a new verification code and send it to the user."""
        clean_target = username_or_email.strip().lower()
        user = None
        if "@" in clean_target:
            user = self.user_repo.get_by_email(clean_target)
        if not user:
            user = self.user_repo.get_by_username(clean_target)

        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found",
            )
        if user.is_verified:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email is already verified",
            )

        code = self._generate_code()
        hashed_code = self._hash_code(code)

        from datetime import datetime, timedelta
        user.verification_code = hashed_code
        user.verification_code_expires_at = datetime.utcnow() + timedelta(minutes=15)
        self.user_repo.update(user)

        background_tasks.add_task(EmailService.send_verification_email, user.email, code)

    def get_current_user(self, token: str) -> User:
        """
        Decode a JWT access token and return the corresponding User.
        Raises 401 if token is invalid or user not found.
        """
        payload = SecurityUtils.decode_token(token)
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
        
        import uuid
        try:
            user_uuid = uuid.UUID(user_id)
        except ValueError:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token ID")

        user = self.user_repo.get(user_uuid)
        if not user:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
        return user

    def save_refresh_token(self, user: User, refresh_token: str) -> None:
        """Hash and save the active refresh token on the user object."""
        user.hashed_refresh_token = SecurityUtils.hash_token(refresh_token)
        self.user_repo.update(user)

    def rotate_refresh_token(self, refresh_token: str) -> tuple[User, str, str]:
        """
        Validate the existing refresh token, ensure it matches the database,
        and generate a brand new rotated access/refresh token pair.
        """
        payload = SecurityUtils.decode_token(refresh_token)
        if payload.get("type") != "refresh":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token type",
            )
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token subject",
            )

        import uuid
        try:
            user_uuid = uuid.UUID(user_id)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token subject ID",
            )
        user = self.user_repo.get(user_uuid)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found",
            )
        if not user.hashed_refresh_token or not SecurityUtils.verify_token(
            refresh_token, user.hashed_refresh_token
        ):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired refresh token",
            )

        # Generate new rotated tokens
        new_access_token = SecurityUtils.create_access_token(str(user.id))
        new_refresh_token = SecurityUtils.create_refresh_token(str(user.id))

        # Persist new refresh token hash
        self.save_refresh_token(user, new_refresh_token)

        return user, new_access_token, new_refresh_token

    def revoke_refresh_token(self, user: User) -> None:
        """Revoke the current refresh token by setting it to None in the database."""
        user.hashed_refresh_token = None
        self.user_repo.update(user)

