from collections.abc import Callable
from functools import partial
from typing import Annotated

from fastapi import APIRouter, Depends, Path

from app.ratelimit import limited
from app.showcase import api as showcase_api
from app.showcase.cache import TtlCache
from app.showcase.enka import fetch as fetch_from_enka
from app.starrail import enka
from app.starrail.models import StarRailShowcase

Fetch = Callable[[str], bytes]

router = APIRouter(
    prefix="/api/starrail/showcase",
    tags=["starrail"],
    dependencies=[Depends(limited(showcase_api.limiter))],
)

# shortcut: the cache lives in one process, so each worker keeps its own;
# move it to Redis when the app runs more than one worker.
cache = TtlCache[StarRailShowcase](max_entries=256)


def get_fetch() -> Fetch:
    return partial(fetch_from_enka, url=enka.ENKA_URL)


@router.get("/{uid}")
def showcase(
    uid: Annotated[str, Path(pattern=showcase_api.UID_PATTERN, description="In-game UID")],
    fetch: Annotated[Fetch, Depends(get_fetch)],
) -> StarRailShowcase:
    return showcase_api.serve(uid, lambda: fetch(uid), enka.parse, cache)
