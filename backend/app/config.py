"""
Centralized settings for the backend, loaded from environment variables.

Phase 0 only needs CORS config so the frontend can reach this service
locally. WEATHERAI_API_KEY is declared here (so the shape of config is
established early) but is not used by any route yet — that lands in
Phase 1 alongside the actual WeatherAI client.
"""
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    weatherai_api_key: str = ""
    weatherai_base_url: str = "https://api.weather-ai.co"
    cors_origins: list[str] = ["http://localhost:3000"]

    model_config = SettingsConfigDict(env_file=".env")


@lru_cache
def get_settings() -> Settings:
    return Settings()
