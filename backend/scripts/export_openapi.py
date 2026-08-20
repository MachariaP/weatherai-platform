#!/usr/bin/env python3
"""Emit the public OpenAPI document to stdout.

Does not start a server and does not call WeatherAI, Photon, or ipwho.is.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from app.main import app  # noqa: E402


def public_openapi() -> dict:
    app.openapi_schema = None
    return app.openapi()


def main() -> None:
    json.dump(public_openapi(), sys.stdout, indent=2)
    sys.stdout.write("\n")


if __name__ == "__main__":
    main()
