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
from app.starrail.relics import (
    MAX_LEVEL,
    MAX_SUBSTATS,
    ROLLS,
    RelicError,
    RelicForecast,
    forecast,
)

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


MAX_STAT_VALUE = 10_000  # far above any substat; keeps nonsense out
MAX_SCORE = 100
PERCENT = 100


class RelicSub(BaseModel):
    key: StarRailStatKey
    value: float | None = Field(
        default=None, ge=0, le=MAX_STAT_VALUE, description="As the game shows it: 5.8 for 5.8%"
    )


class RelicGoal(BaseModel):
    key: StarRailStatKey
    value: float = Field(ge=0, le=MAX_STAT_VALUE, description="As the game shows it")


class RelicQuery(BaseModel):
    main: StarRailStatKey
    subs: list[RelicSub] = Field(min_length=1, max_length=MAX_SUBSTATS)
    level: int = Field(ge=0, le=MAX_LEVEL)
    wanted: set[StarRailStatKey] = Field(description="The substats worth having")
    beat: float | None = Field(
        default=None, ge=0, le=MAX_SCORE, description="The score of the relic to do better than"
    )
    goal: RelicGoal | None = None


def _stored(key: StarRailStatKey, shown: float) -> float:
    """The game shows 5.8 for a stat it stores as 0.058."""
    is_percent = key in ROLLS and ROLLS[key][-1] < 1
    return shown / PERCENT if is_percent else shown


@relics_router.post("/forecast")
def relic_forecast(query: RelicQuery) -> RelicForecast:
    values = {sub.key: _stored(sub.key, sub.value) for sub in query.subs if sub.value is not None}
    goal = None
    if query.goal:
        goal = (query.goal.key, _stored(query.goal.key, query.goal.value))
    try:
        return forecast(
            query.main,
            [sub.key for sub in query.subs],
            query.level,
            query.wanted,
            values=values,
            beat=query.beat,
            goal=goal,
        )
    except RelicError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
