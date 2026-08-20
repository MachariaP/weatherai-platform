"""Settings and CORS origin parsing for the selected single-origin production model."""
import pytest
from pydantic import ValidationError

from app.config import Settings, parse_cors_origins


def test_parse_comma_separated_origins():
    assert parse_cors_origins(
        "https://app.example.com, http://localhost:3000"
    ) == ["https://app.example.com", "http://localhost:3000"]


def test_parse_json_list_origins():
    assert parse_cors_origins('["https://app.example.com"]') == [
        "https://app.example.com"
    ]


def test_settings_default_cors_is_localhost():
    settings = Settings(weatherai_api_key="wai_testkey1")
    assert settings.cors_origin_list == ["http://localhost:3000"]


def test_settings_reject_empty_cors():
    with pytest.raises(ValidationError):
        Settings(weatherai_api_key="wai_testkey1", cors_origins="")


def test_settings_reject_wildcard_cors():
    with pytest.raises(ValidationError):
        Settings(weatherai_api_key="wai_testkey1", cors_origins="*")
    with pytest.raises(ValidationError):
        Settings(
            weatherai_api_key="wai_testkey1",
            cors_origins="http://localhost:3000, *",
        )
