import os
import pytest
from typing import Generator
from sqlmodel import SQLModel, create_engine, Session

from app.main import app
from app.core.database import get_session

# Load/determine test database URL
# If running in CI, it uses PostgreSQL. Locally, if PostgreSQL is not running,
# we default to an in-memory SQLite database.
TEST_DATABASE_URL = os.getenv(
    "DATABASE_URL", "sqlite:///:memory:"
)

# Create the test engine
# For SQLite, we add connect_args and use StaticPool to share the in-memory database across connections
if TEST_DATABASE_URL.startswith("sqlite"):
    from sqlalchemy.pool import StaticPool
    connect_args = {"check_same_thread": False}
    engine = create_engine(
        TEST_DATABASE_URL,
        connect_args=connect_args,
        poolclass=StaticPool,
    )
else:
    engine = create_engine(TEST_DATABASE_URL)


@pytest.fixture(name="session", scope="function")
def session_fixture() -> Generator[Session, None, None]:
    """
    Creates a clean database schema and provides a session for a single test.
    Automatically rolls back transactions and cleans up tables afterwards.
    """
    # Import all models to ensure SQLModel knows about their metadata

    # Create tables
    SQLModel.metadata.create_all(engine)

    with Session(engine) as session:
        yield session

    # Drop tables after test completes
    SQLModel.metadata.drop_all(engine)


@pytest.fixture(name="client", scope="function")
def client_fixture(session: Session) -> Generator[None, None, None]:
    """
    Overrides the FastAPI database session dependency and yields the TestClient.
    """
    from fastapi.testclient import TestClient

    def get_session_override():
        yield session

    # Override get_session dependency
    app.dependency_overrides[get_session] = get_session_override

    with TestClient(app) as test_client:
        yield test_client

    # Clear overrides
    app.dependency_overrides.clear()
