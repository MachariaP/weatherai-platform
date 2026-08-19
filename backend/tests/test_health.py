"""
Phase 0 acceptance test: the service starts and reports healthy without
any WeatherAI dependency, network access, or configured API key.
"""
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health_returns_200():
    response = client.get("/health")
    assert response.status_code == 200


def test_health_response_shape():
    response = client.get("/health")
    body = response.json()
    assert body["status"] == "ok"
    assert body["service"] == "weatherai-qa-backend"
