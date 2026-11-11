"""What the upgrades a relic has left can bring, as exact chances.

How relics upgrade is not published. This follows what the community has established:
a 5★ relic upgrades at +3, +6, +9, +12 and +15; with three substats the upgrade adds a
fourth, drawn by weight from the stats it does not have; with four it raises one of them,
each equally likely.
"""

from collections.abc import Callable, Collection, Mapping, Sequence
from dataclasses import dataclass

from app.starrail.enka import PROPERTIES
from app.starrail.gamedata import GAMEDATA
from app.starrail.models import StarRailStatKey

FIVE_STAR_GROUP = "5"

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


# What one roll adds to a 5★ substat: low, medium or high. Community estimate: the three
# are taken to be equally likely.
ROLLS = {
    PROPERTIES[prop]: (base, base + step, base + 2 * step)
    for prop, base, step in GAMEDATA.sub_affixes[FIVE_STAR_GROUP].values()
}
# Keeps sums of rolls that differ only by float noise in one bucket.
PRECISION = 9
TOLERANCE = 10**-PRECISION

Gains = Callable[[StarRailStatKey], Sequence[float]]
Spread = dict[float, float]  # total gain -> its chance


class RelicError(ValueError):
    """The relic described cannot exist; the message says why, for the player."""


@dataclass(frozen=True)
class RelicForecast:
    upgrades: int  # upgrades the relic has left
    chances: tuple[float, ...]  # chances[n]: exactly n of them go to a wanted substat
    expected: float  # how many go to a wanted substat on average
    # In high rolls: a wanted substat's value over its highest single roll, summed.
    score: float | None  # now; None without the wanted substats' values
    beats: float | None  # the chance to end above the score to beat, when one was given
    reaches: float | None  # the chance the goal stat ends at its goal or above, when one was set


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


def score_of(stat: StarRailStatKey, value: float) -> float:
    return value / ROLLS[stat][-1]


def _add(spread: Spread, gains: Sequence[float], chance: float, into: Spread) -> None:
    """Add to `into` the totals of `spread` after one more roll, taken with `chance`."""
    for total, likelihood in spread.items():
        for gain in gains:
            key = round(total + gain, PRECISION)
            into[key] = into.get(key, 0.0) + likelihood * chance / len(gains)


def _upgraded(subs: Sequence[StarRailStatKey], upgrades: int, gains: Gains) -> Spread:
    """Every upgrade raises one of the four substats, each equally likely."""
    spread: Spread = {0.0: 1.0}
    for _ in range(upgrades):
        after: Spread = {}
        for sub in subs:
            _add(spread, gains(sub), 1 / MAX_SUBSTATS, after)
        spread = after
    return spread


def _spread(
    main: StarRailStatKey, subs: Sequence[StarRailStatKey], upgrades: int, gains: Gains
) -> Spread:
    """Exact, not simulated: the cases are few enough to add up."""
    if len(subs) == MAX_SUBSTATS:
        return _upgraded(subs, upgrades, gains)
    taken = {main, *subs}
    pool = {stat: weight for stat, weight in SUBSTAT_WEIGHTS.items() if stat not in taken}
    spread: Spread = {}
    for new, weight in pool.items():
        later = _upgraded([*subs, new], upgrades - 1, gains)
        _add(later, gains(new), weight / sum(pool.values()), spread)  # the roll it arrives with
    return spread


def _above(spread: Spread, least: float) -> float:
    return sum(chance for total, chance in spread.items() if total >= least - TOLERANCE)


def forecast(  # noqa: PLR0913 - a relic and two optional questions about it
    main: StarRailStatKey,
    subs: Sequence[StarRailStatKey],
    level: int,
    wanted: Collection[StarRailStatKey],
    *,
    values: Mapping[StarRailStatKey, float] | None = None,
    beat: float | None = None,
    goal: tuple[StarRailStatKey, float] | None = None,
) -> RelicForecast:
    """`values` are the substats' current values; `beat` is a score, `goal` a stat and a value."""
    _check(main, subs, level)
    values = values or {}
    upgrades = (MAX_LEVEL - level + UPGRADE_EVERY - 1) // UPGRADE_EVERY

    hits = _spread(main, subs, upgrades, lambda stat: (1.0,) if stat in wanted else (0.0,))
    chances = tuple(hits.get(float(count), 0.0) for count in range(upgrades + 1))

    present = [sub for sub in subs if sub in wanted]
    score = None
    if all(sub in values for sub in present):
        score = sum(score_of(sub, values[sub]) for sub in present)
    beats = None
    if beat is not None:
        if score is None:
            raise RelicError("Enter the value of every substat you want, to compare relics.")
        gained = _spread(
            main,
            subs,
            upgrades,
            lambda stat: (
                [roll / ROLLS[stat][-1] for roll in ROLLS[stat]] if stat in wanted else (0.0,)
            ),
        )
        # Above, not level with: a relic that only ties is not worth the materials.
        beats = sum(chance for total, chance in gained.items() if score + total > beat + TOLERANCE)
    reaches = None
    if goal is not None:
        stat, least = goal
        if stat not in SUBSTAT_WEIGHTS or stat == main:
            raise RelicError("The goal must be a stat this relic can have as a substat.")
        if stat in subs and stat not in values:
            raise RelicError("Enter the current value of the stat you set a goal for.")
        gained = _spread(main, subs, upgrades, lambda sub: ROLLS[sub] if sub == stat else (0.0,))
        reaches = _above(gained, least - values.get(stat, 0.0))
    return RelicForecast(
        upgrades=upgrades,
        chances=chances,
        expected=sum(count * chance for count, chance in enumerate(chances)),
        score=score,
        beats=beats,
        reaches=reaches,
    )
