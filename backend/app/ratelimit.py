"""Per-client request limits.

shortcut: counters live in one process, so each worker counts on its own;
move them to Redis when the app runs more than one worker.
"""

import ipaddress
import math
import time
from collections.abc import Callable
from threading import Lock

from fastapi import HTTPException, Request

MAX_CLIENTS = 10_000
IPV6_SUBSCRIBER_PREFIX = 64
UNKNOWN_CLIENT = "unknown"


class RateLimiter:
    """Allows each client `limit` requests in every `window` seconds."""

    def __init__(
        self,
        limit: int,
        window: float,
        clock: Callable[[], float] = time.monotonic,
        max_clients: int = MAX_CLIENTS,
    ) -> None:
        self.limit = limit
        self._window = window
        self._clock = clock
        self._max_clients = max_clients
        self._windows: dict[str, tuple[float, int]] = {}  # client -> (window end, requests used)
        self._lock = Lock()  # endpoints run on a thread pool

    def seconds_until_allowed(self, client: str) -> float:
        """Count one request: 0 when it may go ahead, otherwise how long the client must wait."""
        with self._lock:
            now = self._clock()
            ends, used = self._windows.get(client, (0.0, 0))
            if ends <= now:
                ends, used = now + self._window, 0
            if used >= self.limit:
                return ends - now
            if client not in self._windows and len(self._windows) >= self._max_clients:
                self._windows = {
                    known: window for known, window in self._windows.items() if window[0] > now
                }
                if len(self._windows) >= self._max_clients:
                    # A flood of new clients must not grow the table without bound.
                    return self._window
            self._windows[client] = (ends, used + 1)
            return 0.0

    def clear(self) -> None:
        with self._lock:
            self._windows.clear()


def client_key(request: Request) -> str:
    """Who to count a request against.

    shortcut: this is the peer address, so behind a reverse proxy every visitor shares one
    allowance; set FORWARDED_ALLOW_IPS to the proxy's address when deploying behind one.
    """
    host = request.client.host if request.client else UNKNOWN_CLIENT
    try:
        address = ipaddress.ip_address(host)
    except ValueError:
        return host
    if isinstance(address, ipaddress.IPv4Address):
        return host
    if address.ipv4_mapped:
        return str(address.ipv4_mapped)
    # One subscriber holds a whole /64 and could rotate through it to dodge the limit.
    return str(ipaddress.ip_network((address, IPV6_SUBSCRIBER_PREFIX), strict=False))


def limited(limiter: RateLimiter) -> Callable[[Request], None]:
    """A route dependency that answers 429 once the client has spent its allowance."""

    def check(request: Request) -> None:
        wait = limiter.seconds_until_allowed(client_key(request))
        if wait > 0:
            seconds = math.ceil(wait)
            raise HTTPException(
                429,
                f"Too many requests. Try again in {seconds} seconds.",
                headers={"Retry-After": str(seconds)},
            )

    return check
