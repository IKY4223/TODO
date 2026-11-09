from typing import Annotated

from fastapi import APIRouter, Query
from pydantic import BaseModel, Field

from app.wishes.engine import GENSHIN_CHARACTER, Forecast, forecast

MAX_COPIES = 7  # C0 through C6
MAX_PULLS = 2000

router = APIRouter(prefix="/api/wishes", tags=["wishes"])


class ForecastQuery(BaseModel):
    pity: int = Field(ge=0, lt=GENSHIN_CHARACTER.hard_pity, description="Pulls since the last 5★")
    guaranteed: bool = Field(description="The next 5★ is guaranteed to be the featured one")
    copies: int = Field(ge=1, le=MAX_COPIES, description="Featured copies wanted")
    pulls: int = Field(ge=0, le=MAX_PULLS, description="Pulls available")


@router.get("/forecast")
def wish_forecast(query: Annotated[ForecastQuery, Query()]) -> Forecast:
    return forecast(
        GENSHIN_CHARACTER,
        pity=query.pity,
        guaranteed=query.guaranteed,
        copies=query.copies,
        pulls=query.pulls,
    )
