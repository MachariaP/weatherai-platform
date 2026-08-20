"""
Centralized settings for the backend, loaded from environment variables.

WEATHERAI_API_KEY is required for any route that calls the upstream API.
The health endpoint still works without it so liveness can be verified
independently.
"""
from functools import lru_cache

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


def parse_cors_origins(value: object) -> list[str]:
    if isinstance(value, list):
        return [str(item).strip() for item in value if str(item).strip()]
    if isinstance(value, str):
        text = value.strip()
        if text.startswith("["):
            inner = text.strip("[]")
            return [part.strip().strip("\"'") for part in inner.split(",") if part.strip()]
        return [part.strip() for part in text.split(",") if part.strip()]
    return ["http://localhost:3000"]


class Settings(BaseSettings):
    weatherai_api_key: str = ""
    weatherai_base_url: str = "https://api.weather-ai.co"
    weatherai_timeout: float = 10.0
    weatherai_max_retries: int = 3
    cors_origins: str = "http://localhost:3000"

    model_config = SettingsConfigDict(env_file=".env")

    @property
    def cors_origin_list(self) -> list[str]:
        return parse_cors_origins(self.cors_origins)

    @field_validator("weatherai_api_key")
    @classmethod
    def _key_format(cls, v: str) -> str:
        if v and not v.startswith("wai_"):
            raise ValueError(
                "WEATHERAI_API_KEY must start with 'wai_' "
                "(see https://weather-ai.co/docs)"
            )
        return v


@lru_cache
def get_settings() -> Settings:
    return Settings()


def require_api_key(settings: Settings | None = None) -> str:
    """Return the API key or raise immediately with a clear message."""
    s = settings or get_settings()
    if not s.weatherai_api_key:
        raise RuntimeError(
            "WEATHERAI_API_KEY is not set. "
            "Add it to backend/.env (see .env.example)."
        )
    return s.weatherai_api_key
