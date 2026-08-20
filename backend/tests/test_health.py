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


def test_cors_allows_configured_localhost_origin():
    response = client.get("/health", headers={"Origin": "http://localhost:3000"})
    assert response.status_code == 200
    assert response.headers.get("access-control-allow-origin") == "http://localhost:3000"
    exposed = response.headers.get("access-control-expose-headers", "").lower()
    assert "x-request-id" in exposed
    assert "x-cache" in exposed
    assert "retry-after" in exposed


def test_cors_does_not_reflect_unknown_origin():
    response = client.get("/health", headers={"Origin": "https://evil.example"})
    assert response.status_code == 200
    assert response.headers.get("access-control-allow-origin") != "https://evil.example"
