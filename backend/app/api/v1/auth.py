from fastapi import APIRouter, Depends, status, Response, Cookie, HTTPException, BackgroundTasks
from fastapi.security import OAuth2PasswordRequestForm
from sqlmodel import Session
from typing import Optional

from app.core.config import settings
from app.core.database import get_session
from app.core.security import SecurityUtils, oauth2_scheme
from app.services.auth_service import AuthService
from app.schemas.user import UserCreate, UserRead, TokenResponse, EmailVerifyRequest, ResendVerificationRequest

router = APIRouter()


@router.post("/register", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def register(
    payload: UserCreate,
    background_tasks: BackgroundTasks,
    session: Session = Depends(get_session),
):
    """Register a new user account."""
    service = AuthService(session)
    return service.register(payload, background_tasks)


@router.post("/verify-email")
def verify_email(payload: EmailVerifyRequest, session: Session = Depends(get_session)):
    """Verify email activation code."""
    service = AuthService(session)
    service.verify_email(payload.username_or_email, payload.code)
    return {"status": "success", "message": "Email verified successfully"}


@router.post("/resend-verification")
def resend_verification(
    payload: ResendVerificationRequest,
    background_tasks: BackgroundTasks,
    session: Session = Depends(get_session),
):
    """Resend email activation code."""
    service = AuthService(session)
    service.resend_verification(payload.username_or_email, background_tasks)
    return {"status": "success", "message": "Verification code resent successfully"}


@router.post("/login", response_model=TokenResponse)
def login(
    response: Response,
    form: OAuth2PasswordRequestForm = Depends(),
    session: Session = Depends(get_session),
):
    """Authenticate with username + password, saving refresh token to HttpOnly cookie."""
    service = AuthService(session)
    user = service.authenticate(form.username, form.password)

    access_token = SecurityUtils.create_access_token(str(user.id))
    refresh_token = SecurityUtils.create_refresh_token(str(user.id))

    # Hash and save refresh token to user model in database
    service.save_refresh_token(user, refresh_token)

    # Set refresh token as a secure HttpOnly cookie
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=(settings.ENVIRONMENT == "production"),
        samesite="lax",
        path="/api/v1/auth",  # Only transmit to auth endpoints (refresh/logout)
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
    )

    return TokenResponse(access_token=access_token)


@router.post("/refresh", response_model=TokenResponse)
def refresh(
    response: Response,
    refresh_token: Optional[str] = Cookie(default=None),
    session: Session = Depends(get_session),
):
    """Rotate the refresh token and get a new access token."""
    if not refresh_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token missing",
        )

    service = AuthService(session)
    user, new_access, new_refresh = service.rotate_refresh_token(refresh_token)

    # Set new rotated refresh token cookie
    response.set_cookie(
        key="refresh_token",
        value=new_refresh,
        httponly=True,
        secure=(settings.ENVIRONMENT == "production"),
        samesite="lax",
        path="/api/v1/auth",
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
    )

    return TokenResponse(access_token=new_access)


@router.post("/logout")
def logout(
    response: Response,
    token: str = Depends(oauth2_scheme),
    session: Session = Depends(get_session),
):
    """Invalidate current refresh token and clear HTTP cookie."""
    service = AuthService(session)
    user = service.get_current_user(token)
    service.revoke_refresh_token(user)

    # Clear client-side cookie
    response.delete_cookie(key="refresh_token", path="/api/v1/auth")

    return {"status": "success", "message": "Successfully logged out"}


@router.get("/me", response_model=UserRead)
def get_me(token: str = Depends(oauth2_scheme), session: Session = Depends(get_session)):
    """Return the profile of the currently authenticated user."""
    service = AuthService(session)
    return service.get_current_user(token)

