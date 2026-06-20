from fastapi import APIRouter, Depends, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlmodel import Session

from app.core.database import get_session
from app.core.security import SecurityUtils, oauth2_scheme
from app.services.auth_service import AuthService
from app.schemas.user import UserCreate, UserRead, TokenResponse

router = APIRouter()


@router.post("/register", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def register(payload: UserCreate, session: Session = Depends(get_session)):
    """Register a new user account."""
    service = AuthService(session)
    return service.register(payload)


@router.post("/login", response_model=TokenResponse)
def login(form: OAuth2PasswordRequestForm = Depends(), session: Session = Depends(get_session)):
    """Authenticate with username + password and receive JWT tokens."""
    service = AuthService(session)
    user = service.authenticate(form.username, form.password)
    return TokenResponse(
        access_token=SecurityUtils.create_access_token(str(user.id)),
        refresh_token=SecurityUtils.create_refresh_token(str(user.id)),
    )


@router.get("/me", response_model=UserRead)
def get_me(token: str = Depends(oauth2_scheme), session: Session = Depends(get_session)):
    """Return the profile of the currently authenticated user."""
    service = AuthService(session)
    return service.get_current_user(token)
