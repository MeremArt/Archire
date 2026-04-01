import time
from typing import Any, Optional, Dict
from threading import Lock

from app.core.config import settings


class SimpleCache:
    """Thread-safe in-memory TTL cache."""

    def __init__(self, default_ttl: int = settings.CACHE_TTL_SECONDS):
        self._store: Dict[str, Dict[str, Any]] = {}
        self._lock = Lock()
        self.default_ttl = default_ttl

    def get(self, key: str) -> Optional[Any]:
        with self._lock:
            entry = self._store.get(key)
            if entry is None:
                return None
            if time.time() > entry["expires_at"]:
                del self._store[key]
                return None
            return entry["value"]

    def set(self, key: str, value: Any, ttl: Optional[int] = None) -> None:
        with self._lock:
            self._store[key] = {
                "value": value,
                "expires_at": time.time() + (ttl or self.default_ttl),
            }

    def delete(self, key: str) -> None:
        with self._lock:
            self._store.pop(key, None)

    def clear(self) -> None:
        with self._lock:
            self._store.clear()

    def cleanup_expired(self) -> int:
        with self._lock:
            now = time.time()
            expired = [k for k, v in self._store.items() if now > v["expires_at"]]
            for key in expired:
                del self._store[key]
            return len(expired)


# Module-level singleton
cache = SimpleCache()
