"""
Tests for the in-memory TTL cache.

Six deliberate test categories:
  1. Cache miss on empty cache
  2. Cache hit within TTL
  3. Cache expiry after TTL
  4. Different parameters produce different keys
  5. Equivalent parameters produce the same key
  6. Concurrent identical requests (document current behavior)
"""
from __future__ import annotations

import time
from unittest.mock import patch

from app.cache import DEFAULT_TTL_SECONDS, InMemoryCache, make_cache_key


# ── Test 1: Cache miss ─────────────────────────────────────────────

def test_get_returns_none_on_empty_cache():
    cache = InMemoryCache()
    assert cache.get("nonexistent") is None


# ── Test 2: Cache hit within TTL ───────────────────────────────────

def test_get_returns_value_within_ttl():
    cache = InMemoryCache()
    cache.set("key1", {"temp": 22.0}, ttl_seconds=60.0)
    assert cache.get("key1") == {"temp": 22.0}


def test_cache_preserves_exact_value():
    cache = InMemoryCache()
    data = {"lat": -1.29, "current": {"temperature": 21.1}, "daily": []}
    cache.set("full", data, ttl_seconds=60.0)
    assert cache.get("full") is data


# ── Test 3: Cache expiry ───────────────────────────────────────────

def test_get_returns_none_after_ttl_expires():
    cache = InMemoryCache()
    now = time.monotonic()

    with patch("app.cache.time.monotonic", return_value=now):
        cache.set("expiring", "value", ttl_seconds=10.0)

    with patch("app.cache.time.monotonic", return_value=now + 10.1):
        assert cache.get("expiring") is None


def test_expired_entry_is_removed_from_store():
    cache = InMemoryCache()
    now = time.monotonic()

    with patch("app.cache.time.monotonic", return_value=now):
        cache.set("expiring", "value", ttl_seconds=5.0)

    assert cache.size == 1

    with patch("app.cache.time.monotonic", return_value=now + 5.1):
        cache.get("expiring")

    assert cache.size == 0


def test_entry_still_valid_at_exact_ttl_boundary():
    cache = InMemoryCache()
    now = time.monotonic()

    with patch("app.cache.time.monotonic", return_value=now):
        cache.set("boundary", "value", ttl_seconds=10.0)

    with patch("app.cache.time.monotonic", return_value=now + 10.0):
        assert cache.get("boundary") == "value"


# ── Test 4: Different parameters → different keys ──────────────────

def test_different_lat_produces_different_key():
    k1 = make_cache_key(lat=0.0, lon=0.0, days=7, units="metric", ai=False, lang="en")
    k2 = make_cache_key(lat=1.0, lon=0.0, days=7, units="metric", ai=False, lang="en")
    assert k1 != k2


def test_different_units_produces_different_key():
    k1 = make_cache_key(lat=0.0, lon=0.0, days=7, units="metric", ai=False, lang="en")
    k2 = make_cache_key(lat=0.0, lon=0.0, days=7, units="imperial", ai=False, lang="en")
    assert k1 != k2


def test_different_ai_produces_different_key():
    k1 = make_cache_key(lat=0.0, lon=0.0, days=7, units="metric", ai=False, lang="en")
    k2 = make_cache_key(lat=0.0, lon=0.0, days=7, units="metric", ai=True, lang="en")
    assert k1 != k2


def test_different_days_produces_different_key():
    k1 = make_cache_key(lat=0.0, lon=0.0, days=3, units="metric", ai=False, lang="en")
    k2 = make_cache_key(lat=0.0, lon=0.0, days=7, units="metric", ai=False, lang="en")
    assert k1 != k2


def test_different_lang_produces_different_key():
    k1 = make_cache_key(lat=0.0, lon=0.0, days=7, units="metric", ai=True, lang="en")
    k2 = make_cache_key(lat=0.0, lon=0.0, days=7, units="metric", ai=True, lang="sw")
    assert k1 != k2


# ── Test 5: Equivalent parameters → same key ──────────────────────

def test_same_params_in_any_call_order_produce_same_key():
    k1 = make_cache_key(lat=-1.29, lon=36.82, days=7, units="metric", ai=False, lang="en")
    k2 = make_cache_key(units="metric", ai=False, lon=36.82, lat=-1.29, days=7, lang="en")
    assert k1 == k2


# ── Test 6: Concurrent behavior (document, don't solve) ───────────

def test_concurrent_sets_last_write_wins():
    """
    Two sets with the same key — the second overwrites the first.
    This is the current (unsynchronized) behavior.  If we needed
    request deduplication, we'd add a lock/future mechanism.
    For now, documenting the behavior is sufficient.
    """
    cache = InMemoryCache()
    cache.set("same_key", "first", ttl_seconds=60.0)
    cache.set("same_key", "second", ttl_seconds=60.0)
    assert cache.get("same_key") == "second"


# ── Default TTL value ──────────────────────────────────────────────

def test_default_ttl_is_five_minutes():
    assert DEFAULT_TTL_SECONDS == 300.0


# ── Clear ──────────────────────────────────────────────────────────

def test_clear_removes_all_entries():
    cache = InMemoryCache()
    cache.set("a", 1, ttl_seconds=60.0)
    cache.set("b", 2, ttl_seconds=60.0)
    assert cache.size == 2
    cache.clear()
    assert cache.size == 0
    assert cache.get("a") is None
