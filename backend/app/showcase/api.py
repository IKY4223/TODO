from collections.abc import Callable
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Path

from app.ratelimit import RateLimiter, limited
from app.showcase import enka
from app.showcase.cache import TtlCache
from app.showcase.models import Showcase

Fetch = Callable[[str], bytes]

UID_PATTERN = r"^\d{9,10}$"
UNAVAILABLE = (502, "Enka.Network is not responding. Try again later.")
# Enka's status -> the status and message this API answers with.
FAILURES: dict[int | None, tuple[int, str]] = {
    400: (400, "Enka.Network does not accept this UID."),
    404: (404, "Player not found. Check the UID."),
    424: (503, "The game is under maintenance. Try again later."),
    429: (503, "Too many requests to Enka.Network. Try again in a minute."),
}

# Every uncached request spends this app's Enka quota, so one client gets few of them.
limiter = RateLimiter(limit=10, window=60)

router = APIRouter(
    prefix="/api/showcase", tags=["showcase"], dependencies=[Depends(limited(limiter))]
)

# shortcut: the cache lives in one process, so each worker keeps its own;
# move it to Redis when the app runs more than one worker.
cache = TtlCache[Showcase](max_entries=256)


def get_fetch() -> Fetch:
    return enka.fetch


@router.get("/{uid}")
def showcase(
    uid: Annotated[str, Path(pattern=UID_PATTERN, description="In-game UID")],
    fetch: Annotated[Fetch, Depends(get_fetch)],
) -> Showcase:
    cached = cache.get(uid)
    if cached is not None:
        return cached
    try:
        result, ttl = enka.parse(uid, fetch(uid))
    except enka.EnkaError as error:
        status, detail = FAILURES.get(error.status, UNAVAILABLE)
        raise HTTPException(status, detail) from error
    except enka.UpstreamDataError as error:
        raise HTTPException(502, "Enka.Network sent data this app cannot read.") from error
    cache.put(uid, result, ttl)  # Enka asks clients not to refetch before the ttl ends
    return result
