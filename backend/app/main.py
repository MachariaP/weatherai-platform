"""
WeatherAI QA project — FastAPI backend.

The /health endpoint never depends on an external service — it answers
"is our process up", not "is WeatherAI up".  Weather routes are
registered from app.routes.weather.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.models import HealthResponse
from app.observability import RequestContextMiddleware
from app.routes.geocode import router as geocode_router
from app.routes.weather import router as weather_router

settings = get_settings()

app = FastAPI(
    title="WeatherAI QA Backend",
    version="0.2.0",
    description="Backend service wrapping the WeatherAI API for the QA Engineer take-home assignment.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_methods=["GET"],
    allow_headers=["*"],
)
app.add_middleware(RequestContextMiddleware)

app.include_router(weather_router)
app.include_router(geocode_router)


@app.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    """
    Liveness check for this service only.

    Deliberately does not call WeatherAI or any external dependency —
    this endpoint answers "is our process up", not "is WeatherAI up".
    Those are different questions and get different checks.
    """
    return HealthResponse(status="ok", service="weatherai-qa-backend")
