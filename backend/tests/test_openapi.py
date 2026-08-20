"""Public OpenAPI contract — schema metadata only, no upstream calls."""
from __future__ import annotations

from app.main import app

FORBIDDEN_SCHEMA_PREFIXES = ("Upstream",)
FORBIDDEN_SUBSTRINGS = (
    "WEATHERAI_API_KEY",
    "Authorization",
    "wai_",
    "photon.komoot.io",
    "ipwho.is",
    "api.weather-ai.co",
)


def _schema() -> dict:
    app.openapi_schema = None
    return app.openapi()


def _ref_name(schema: dict) -> str | None:
    ref = schema.get("$ref")
    if isinstance(ref, str) and ref.startswith("#/components/schemas/"):
        return ref.rsplit("/", 1)[-1]
    return None


def _json_schema(openapi: dict, path: str, status: str = "200") -> dict:
    return openapi["paths"][path]["get"]["responses"][status]["content"][
        "application/json"
    ]["schema"]


def _is_nullable_number(schema: dict) -> bool:
    if schema.get("type") == "number" and schema.get("nullable") is True:
        return True
    options = schema.get("anyOf") or schema.get("oneOf") or []
    types = {item.get("type") for item in options if isinstance(item, dict)}
    return "number" in types and "null" in types


def test_weather_response_references_weather_response():
    openapi = _schema()
    name = _ref_name(_json_schema(openapi, "/weather"))
    assert name == "WeatherResponse"
    assert "WeatherResponse" in openapi["components"]["schemas"]


def test_geocode_response_references_search_list():
    openapi = _schema()
    name = _ref_name(_json_schema(openapi, "/geocode"))
    assert name == "GeocodeSearchResponse"
    search = openapi["components"]["schemas"]["GeocodeSearchResponse"]
    results = search["properties"]["results"]
    assert results["type"] == "array"
    item_name = _ref_name(results["items"])
    assert item_name == "GeocodeResult"


def test_reverse_and_geolocate_use_geocode_result():
    openapi = _schema()
    assert _ref_name(_json_schema(openapi, "/reverse")) == "GeocodeResult"
    assert _ref_name(_json_schema(openapi, "/geolocate")) == "GeocodeResult"


def test_geocode_region_and_country_are_optional():
    openapi = _schema()
    result = openapi["components"]["schemas"]["GeocodeResult"]
    required = set(result.get("required", []))
    assert "lat" in required and "lon" in required and "label" in required
    assert "region" not in required
    assert "country" not in required
    assert "region" in result["properties"]
    assert "country" in result["properties"]


def test_precipitation_is_required_and_nullable():
    openapi = _schema()
    for model_name in ("ForecastDay", "HourlyForecast"):
        model = openapi["components"]["schemas"][model_name]
        precip = model["properties"]["precipitation"]
        assert "precipitation" in model["required"]
        assert _is_nullable_number(precip)


def test_weather_query_params():
    openapi = _schema()
    params = {
        item["name"]: item
        for item in openapi["paths"]["/weather"]["get"]["parameters"]
        if item["in"] == "query"
    }
    assert set(params) == {"lat", "lon", "days", "ai", "units", "lang"}
    assert params["lat"]["required"] is True
    assert params["lon"]["required"] is True
    assert params["days"]["schema"]["minimum"] == 1
    assert params["days"]["schema"]["maximum"] == 7
    units = params["units"]["schema"]
    assert units.get("enum") == ["metric", "imperial"] or set(units.get("enum", [])) == {
        "metric",
        "imperial",
    }


def test_public_errors_use_api_error_model():
    openapi = _schema()
    weather_errors = openapi["paths"]["/weather"]["get"]["responses"]
    for status in ("400", "403", "429", "502", "504"):
        name = _ref_name(weather_errors[status]["content"]["application/json"]["schema"])
        assert name == "ApiError"
    error = openapi["components"]["schemas"]["ApiError"]
    assert set(error["required"]) == {"error", "message"}


def test_openapi_does_not_leak_upstream_or_secrets():
    openapi = _schema()
    names = openapi["components"]["schemas"].keys()
    for name in names:
        assert not name.startswith(FORBIDDEN_SCHEMA_PREFIXES)
        assert "Photon" not in name
        assert "Ipwho" not in name
    dumped = str(openapi)
    for needle in FORBIDDEN_SUBSTRINGS:
        assert needle not in dumped
