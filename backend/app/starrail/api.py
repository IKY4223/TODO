from collections.abc import Callable
from functools import partial
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Path
from pydantic import BaseModel, Field

from app.ratelimit import RateLimiter, limited
from app.showcase import api as showcase_api
from app.showcase.cache import TtlCache
from app.showcase.enka import fetch as fetch_from_enka
from app.starrail import enka
from app.starrail.models import StarRailShowcase, StarRailStatKey
from app.starrail.relics import MAX_LEVEL, MAX_SUBSTATS, RelicError, RelicForecast, forecast

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


relics_limiter = RateLimiter(limit=60, window=60)
relics_router = APIRouter(
    prefix="/api/starrail/relics",
    tags=["starrail"],
    dependencies=[Depends(limited(relics_limiter))],
)


class RelicQuery(BaseModel):
    main: StarRailStatKey
    subs: list[StarRailStatKey] = Field(min_length=1, max_length=MAX_SUBSTATS)
    level: int = Field(ge=0, le=MAX_LEVEL)
    wanted: set[StarRailStatKey] = Field(min_length=1, description="The substats worth having")


@relics_router.post("/forecast")
def relic_forecast(query: RelicQuery) -> RelicForecast:
    try:
        return forecast(query.main, query.subs, query.level, query.wanted)
    except RelicError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
