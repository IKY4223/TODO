import time
from collections.abc import Callable
from threading import Lock


class TtlCache[T]:
    """In-process cache whose entries each expire after their own lifetime."""

    def __init__(self, max_entries: int, clock: Callable[[], float] = time.monotonic) -> None:
        self._entries: dict[str, tuple[float, T]] = {}
        self._max_entries = max_entries
        self._clock = clock
        self._lock = Lock()  # endpoints run on a thread pool

    def get(self, key: str) -> T | None:
        with self._lock:
            entry = self._entries.get(key)
            if entry is None or entry[0] <= self._clock():
                return None
            return entry[1]

    def put(self, key: str, value: T, ttl: float) -> None:
        with self._lock:
            self._entries.pop(key, None)  # so a refreshed key counts as the newest
            if len(self._entries) >= self._max_entries:
                del self._entries[next(iter(self._entries))]
            self._entries[key] = (self._clock() + ttl, value)

    def clear(self) -> None:
        with self._lock:
            self._entries.clear()
