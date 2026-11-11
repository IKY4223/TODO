import logging
from collections.abc import Callable
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Path

from app.ratelimit import RateLimiter, limited
from app.showcase import enka
from app.showcase.cache import TtlCache
from app.showcase.models import Showcase

Fetch = Callable[[str], bytes]

logger = logging.getLogger(__name__)

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
# Shared by every game's showcase: the quota is one.
limiter = RateLimiter(limit=10, window=60)

router = APIRouter(
    prefix="/api/showcase", tags=["showcase"], dependencies=[Depends(limited(limiter))]
)

# shortcut: the cache lives in one process, so each worker keeps its own;
# move it to Redis when the app runs more than one worker.
cache = TtlCache[Showcase](max_entries=256)


def get_fetch() -> Fetch:
    return enka.fetch


def serve[TShowcase](
    uid: str,
    download: Callable[[], bytes],
    parse: Callable[[str, bytes], tuple[TShowcase, int]],
    store: TtlCache[TShowcase],
) -> TShowcase:
    """A game's showcase from the cache, or else from Enka, with failures made readable."""
    cached = store.get(uid)
    if cached is not None:
        return cached
    try:
        result, ttl = parse(uid, download())
    except enka.EnkaError as error:
        logger.warning("Enka request for %s failed: %s", uid, error.status)
        status, detail = FAILURES.get(error.status, UNAVAILABLE)
        raise HTTPException(status, detail) from error
    except enka.UpstreamDataError as error:
        # With the cause: an unreadable response usually means Enka changed its format.
        logger.warning("Enka data for %s is unreadable", uid, exc_info=error)
        raise HTTPException(502, "Enka.Network sent data this app cannot read.") from error
    store.put(uid, result, ttl)  # Enka asks clients not to refetch before the ttl ends
    return result


@router.get("/{uid}")
def showcase(
    uid: Annotated[str, Path(pattern=UID_PATTERN, description="In-game UID")],
    fetch: Annotated[Fetch, Depends(get_fetch)],
) -> Showcase:
    return serve(uid, lambda: fetch(uid), enka.parse, cache)
