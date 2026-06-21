from sqlmodel import SQLModel, create_engine, Session
from sqlalchemy.pool import QueuePool
from typing import Generator

from app.core.config import settings


# Neon's pooler endpoint URLs contain "-pooler" in the hostname.
# When using their PgBouncer pooler we should use NullPool on the SQLAlchemy
# side (the pooler itself manages the real connections).  For direct
# connections we use a small QueuePool so connections stay warm between
# requests and we avoid the expensive cold-connect penalty.
_is_pooler_url = "-pooler." in settings.DATABASE_URL

connect_args: dict = {}
pool_kwargs: dict = {}

if settings.DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}
else:
    # Use pooling for all PostgreSQL connections (including PgBouncer pooler)
    # to avoid the TLS handshake overhead on every request in persistent containers like Render.
    pool_kwargs = {
        "poolclass": QueuePool,
        "pool_size": 5,
        "max_overflow": 10,
        "pool_pre_ping": True,       # drop stale connections automatically
        "pool_recycle": 300,         # recycle connections every 5 min
    }

engine = create_engine(
    settings.DATABASE_URL,
    echo=(settings.ENVIRONMENT == "development"),  # Log SQL in dev only
    connect_args=connect_args,
    **pool_kwargs,
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
