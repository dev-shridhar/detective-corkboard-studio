"""
Phase 1 smoke tests — verify the FastAPI app starts and health endpoint works.
Full unit tests for Auth, Board, Node, and Edge services will be added in Phases 2–5.
"""
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_health_check():
    """Root endpoint should return 200 with status ok."""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "app" in data
    assert "version" in data


def test_openapi_docs_accessible():
    """OpenAPI schema endpoint should be accessible."""
    response = client.get("/api/openapi.json")
    assert response.status_code == 200
