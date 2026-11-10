from typing import Literal

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from app.damage.engine import Damage, Enemy, Hit, Reaction, damage
from app.ratelimit import RateLimiter, limited
from app.showcase.models import StatKey

Scaling = Literal[StatKey.ATK, StatKey.HP, StatKey.DEF, StatKey.ELEMENTAL_MASTERY]
DamageBonus = Literal[
    StatKey.PHYSICAL_DMG,
    StatKey.PYRO_DMG,
    StatKey.HYDRO_DMG,
    StatKey.ELECTRO_DMG,
    StatKey.CRYO_DMG,
    StatKey.ANEMO_DMG,
    StatKey.GEO_DMG,
    StatKey.DENDRO_DMG,
]

# Generous bounds: they keep nonsense out without tracking each game version's caps.
MAX_LEVEL = 100
MAX_ENEMY_LEVEL = 200
MAX_STAT = 1_000_000
MAX_STATS = 30
MAX_MULTIPLIER = 100  # 10 000%
MIN_RESISTANCE = -1
MAX_RESISTANCE = 10

limiter = RateLimiter(limit=60, window=60)

router = APIRouter(prefix="/api/damage", tags=["damage"], dependencies=[Depends(limited(limiter))])


class StatValue(BaseModel):
    key: StatKey
    # Negative on purpose: Kokomi's CRIT Rate is below zero.
    value: float = Field(ge=-MAX_STAT, le=MAX_STAT, allow_inf_nan=False)


class DamageRequest(BaseModel):
    level: int = Field(ge=1, le=MAX_LEVEL, description="Character level")
    stats: list[StatValue] = Field(max_length=MAX_STATS, description="The character's final stats")
    scaling: Scaling = Field(description="The stat the talent multiplies")
    multiplier: float = Field(
        gt=0, le=MAX_MULTIPLIER, allow_inf_nan=False, description="Talent multiplier: 3.92 is 392%"
    )
    bonus: DamageBonus | None = Field(description="The damage bonus that applies to the hit")
    reaction: Reaction
    enemy_level: int = Field(ge=1, le=MAX_ENEMY_LEVEL)
    enemy_resistance: float = Field(
        ge=MIN_RESISTANCE, le=MAX_RESISTANCE, allow_inf_nan=False, description="0.1 is 10%"
    )


@router.post("")
def calculate_damage(request: DamageRequest) -> Damage:
    return damage(
        request.level,
        {stat.key: stat.value for stat in request.stats},
        Hit(request.scaling, request.multiplier, request.bonus, request.reaction),
        Enemy(request.enemy_level, request.enemy_resistance),
    )
