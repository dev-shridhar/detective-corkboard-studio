from sqlmodel import SQLModel, create_engine, Session
from typing import Generator

from app.core.config import settings


# Create the SQLAlchemy engine
engine = create_engine(
    settings.DATABASE_URL,
    echo=(settings.ENVIRONMENT == "development"),  # Log SQL in dev only
)


def create_db_and_tables() -> None:
    """Create all database tables from SQLModel metadata. Called at startup."""
    SQLModel.metadata.create_all(engine)


def get_session() -> Generator[Session, None, None]:
    """
    FastAPI dependency that yields a database session per request.
    Automatically commits on success or rolls back on exception.
    """
    with Session(engine) as session:
        yield session
