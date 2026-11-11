"""What the upgrades a relic has left can bring, as exact chances.

How relics upgrade is not published. This follows what the community has established:
a 5★ relic upgrades at +3, +6, +9, +12 and +15; with three substats the upgrade adds a
fourth, drawn by weight from the stats it does not have; with four it raises one of them,
each equally likely.
"""

from collections.abc import Collection, Sequence
from dataclasses import dataclass
from math import comb

from app.starrail.models import StarRailStatKey

MAX_LEVEL = 15
UPGRADE_EVERY = 3
MAX_SUBSTATS = 4

# Community estimate, not published by the game: the weight of each stat when a new
# substat is drawn. The stats already on the relic, main stat included, leave the pool.
SUBSTAT_WEIGHTS = {
    StarRailStatKey.HP: 10,
    StarRailStatKey.ATK: 10,
    StarRailStatKey.DEF: 10,
    StarRailStatKey.HP_PERCENT: 10,
    StarRailStatKey.ATK_PERCENT: 10,
    StarRailStatKey.DEF_PERCENT: 10,
    StarRailStatKey.SPD: 4,
    StarRailStatKey.CRIT_RATE: 6,
    StarRailStatKey.CRIT_DMG: 6,
    StarRailStatKey.EFFECT_HIT_RATE: 8,
    StarRailStatKey.EFFECT_RES: 8,
    StarRailStatKey.BREAK_EFFECT: 8,
}


class RelicError(ValueError):
    """The relic described cannot exist; the message says why, for the player."""


@dataclass(frozen=True)
class RelicForecast:
    upgrades: int  # upgrades the relic has left
    chances: tuple[float, ...]  # chances[n]: exactly n of them go to a wanted substat
    expected: float  # how many go to a wanted substat on average


def _check(main: StarRailStatKey, subs: Sequence[StarRailStatKey], level: int) -> None:
    if len(set(subs)) != len(subs):
        raise RelicError("A relic cannot have the same substat twice.")
    if main in subs:
        raise RelicError("A substat cannot be the same as the main stat.")
    if not all(sub in SUBSTAT_WEIGHTS for sub in subs):
        raise RelicError("One of these stats never appears as a substat.")
    # shortcut: 5★ relics only; add the lower rarities' substat counts and level caps
    # when someone asks to judge a 4★ relic.
    if len(subs) not in (MAX_SUBSTATS - 1, MAX_SUBSTATS):
        raise RelicError("A 5★ relic has 3 or 4 substats.")
    if len(subs) < MAX_SUBSTATS and level >= UPGRADE_EVERY:
        raise RelicError("A relic at +3 or higher has 4 substats.")


def _hits(upgrades: int, chance: float) -> list[float]:
    """The chance of each number of hits when every upgrade hits with `chance`."""
    return [
        comb(upgrades, hits) * chance**hits * (1 - chance) ** (upgrades - hits)
        for hits in range(upgrades + 1)
    ]


def forecast(
    main: StarRailStatKey,
    subs: Sequence[StarRailStatKey],
    level: int,
    wanted: Collection[StarRailStatKey],
) -> RelicForecast:
    """Exact, not simulated: the cases are few enough to add up."""
    _check(main, subs, level)
    upgrades = (MAX_LEVEL - level + UPGRADE_EVERY - 1) // UPGRADE_EVERY
    chances = [0.0] * (upgrades + 1)
    if len(subs) == MAX_SUBSTATS:
        good = sum(sub in wanted for sub in subs)
        chances = _hits(upgrades, good / MAX_SUBSTATS)
    else:
        taken = {main, *subs}
        pool = {stat: weight for stat, weight in SUBSTAT_WEIGHTS.items() if stat not in taken}
        total = sum(pool.values())
        for new, weight in pool.items():
            arrives_wanted = new in wanted
            good = sum(sub in wanted for sub in subs) + arrives_wanted
            for hits, chance in enumerate(_hits(upgrades - 1, good / MAX_SUBSTATS)):
                chances[hits + arrives_wanted] += weight / total * chance
    expected = sum(hits * chance for hits, chance in enumerate(chances))
    return RelicForecast(upgrades, tuple(chances), expected)
