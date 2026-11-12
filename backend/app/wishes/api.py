import logging
from collections.abc import Callable
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field, model_validator

from app.ratelimit import RateLimiter, limited
from app.wishes import history
from app.wishes.engine import BANNERS, Forecast, forecast
from app.wishes.history import HistoryError, LinkError, Page

MAX_COPIES = max(banner.max_copies for banner in BANNERS.values())
MAX_PULLS = 2000

MAX_LINK_LENGTH = 5000  # the whole error page text, link included, is about 1.5 kB
MAX_PULL_ID_DIGITS = 20
# A full import pages through every banner: 3000 pulls is 150 requests.
HISTORY_REQUESTS_PER_MINUTE = 150
THROTTLED = 429
RETRY_AFTER_SECONDS = 3

Fetch = Callable[[str], bytes]
# The banner types to ask for; 400, the second character banner, comes back with 301.
HistoryBanner = Literal["100", "200", "301", "302", "500"]

logger = logging.getLogger(__name__)

limiter = RateLimiter(limit=60, window=60)
history_limiter = RateLimiter(limit=HISTORY_REQUESTS_PER_MINUTE, window=60)

router = APIRouter(prefix="/api/wishes", tags=["wishes"])


ForecastBanner = Literal["genshin_character", "starrail_character", "starrail_light_cone"]


class ForecastQuery(BaseModel):
    banner: ForecastBanner = "genshin_character"
    pity: int = Field(ge=0, description="Pulls since the last 5★")
    guaranteed: bool = Field(description="The next 5★ is guaranteed to be the featured one")
    copies: int = Field(ge=1, le=MAX_COPIES, description="Featured copies wanted")
    pulls: int = Field(ge=0, le=MAX_PULLS, description="Pulls available")

    @model_validator(mode="after")
    def fits_the_banner(self) -> "ForecastQuery":
        banner = BANNERS[self.banner]
        if self.pity >= banner.hard_pity:
            raise ValueError(f"pity must be below {banner.hard_pity} on this banner")
        if self.copies > banner.max_copies:
            raise ValueError(f"at most {banner.max_copies} copies on this banner")
        return self


@router.get("/forecast", dependencies=[Depends(limited(limiter))])
def wish_forecast(query: Annotated[ForecastQuery, Query()]) -> Forecast:
    return forecast(
        BANNERS[query.banner],
        pity=query.pity,
        guaranteed=query.guaranteed,
        copies=query.copies,
        pulls=query.pulls,
    )


class HistoryRequest(BaseModel):
    link: str = Field(
        max_length=MAX_LINK_LENGTH, description="The wish history link, or the text it is in"
    )
    banner: HistoryBanner
    end_id: str = Field(
        pattern=rf"^\d{{1,{MAX_PULL_ID_DIGITS}}}$",
        description="Return pulls older than this one; 0 for the newest",
    )


def get_history_fetch() -> Fetch:
    return history.fetch


# POST, not GET: the link holds a secret key, and URLs end up in access logs.
@router.post("/history", dependencies=[Depends(limited(history_limiter))])
def wish_history(
    request: HistoryRequest, fetch: Annotated[Fetch, Depends(get_history_fetch)]
) -> Page:
    try:
        params = history.parse_link(request.link)
        page = history.parse_page(
            fetch(history.history_url(params, request.banner, request.end_id))
        )
    except LinkError as error:
        raise HTTPException(400, str(error)) from error
    except HistoryError as error:
        # Only the status and message: the cause can quote the request URL, key included.
        logger.warning("Wish history request failed: %s %s", error.status, error.detail)
        headers = {"Retry-After": str(RETRY_AFTER_SECONDS)} if error.status == THROTTLED else None
        raise HTTPException(error.status, error.detail, headers=headers) from None
    return page
