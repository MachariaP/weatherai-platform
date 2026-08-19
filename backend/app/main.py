"""
WeatherAI QA project — FastAPI backend.

Phase 0 scope: application process, health check, CORS for local dev.
No WeatherAI integration yet — that's Phase 1. This endpoint must never
depend on an external service, so the app's own liveness can always be
verified independently of WeatherAI's availability.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings

settings = get_settings()

app = FastAPI(
    title="WeatherAI QA Backend",
    version="0.1.0",
    description="Backend service wrapping the WeatherAI API for the QA Engineer take-home assignment.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_methods=["GET"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict:
    """
    Liveness check for this service only.

    Deliberately does not call WeatherAI or any external dependency —
    this endpoint answers "is our process up", not "is WeatherAI up".
    Those are different questions and get different checks.
    """
    return {"status": "ok", "service": "weatherai-qa-backend"}
