"""Exact odds of pulling a featured 5-star from a limited banner.

HoYoverse publishes each banner's base rate, hard pity, consolidated rate and featured rate
on the game's banner details page. The soft pity ramps are community estimates, chosen so that
they reproduce the published consolidated rate.
"""

from bisect import bisect_left
from dataclasses import dataclass
from functools import lru_cache
from itertools import accumulate


@dataclass(frozen=True)
class Banner:
    base_rate: float  # 5-star chance per pull before soft pity
    soft_pity: int  # first pull with a raised rate
    rate_step: float  # added to the rate on every pull from soft pity on
    hard_pity: int  # this pull is always a 5-star
    featured_rate: float  # chance that a 5-star without a guarantee is the featured one
    max_copies: int  # copies worth having: C0 to C6 is 7, S1 to S5 is 5


@dataclass(frozen=True)
class Milestone:
    chance: float
    pulls: int  # fewest pulls that reach `chance`


@dataclass(frozen=True)
class Forecast:
    probability: float  # chance to own every wanted copy within the given pulls
    guaranteed_at: int  # pulls after which success is certain
    milestones: tuple[Milestone, ...]


# shortcut: Capturing Radiance (5.0+) is not modelled, so real odds are slightly better;
# model it once its trigger rule is confirmed.
GENSHIN_CHARACTER = Banner(
    base_rate=0.006, soft_pity=74, rate_step=0.06, hard_pity=90, featured_rate=0.5, max_copies=7
)
# Published: 0.6% base, 1.6% consolidated, a 5-star within 90, 50% featured. The same ramp
# as Genshin's reproduces it.
STAR_RAIL_CHARACTER = Banner(
    base_rate=0.006, soft_pity=74, rate_step=0.06, hard_pity=90, featured_rate=0.5, max_copies=7
)
# Published: 0.8% base, 1.87% consolidated, a 5-star within 80, 75% featured.
STAR_RAIL_LIGHT_CONE = Banner(
    base_rate=0.008, soft_pity=66, rate_step=0.07, hard_pity=80, featured_rate=0.75, max_copies=5
)
BANNERS = {
    "genshin_character": GENSHIN_CHARACTER,
    "starrail_character": STAR_RAIL_CHARACTER,
    "starrail_light_cone": STAR_RAIL_LIGHT_CONE,
}

MILESTONE_CHANCES = (0.5, 0.9, 0.99)


def five_star_rate(banner: Banner, pull: int) -> float:
    """Chance of a 5-star on the `pull`-th pull since the last one (1-based)."""
    if pull >= banner.hard_pity:
        return 1.0
    return min(1.0, banner.base_rate + banner.rate_step * max(0, pull - banner.soft_pity + 1))


def _next_five_star(banner: Banner, pity: int) -> list[float]:
    """result[n] = chance the next 5-star lands exactly n pulls from now."""
    result = [0.0]
    still_waiting = 1.0
    for pull in range(pity + 1, banner.hard_pity + 1):
        rate = five_star_rate(banner, pull)
        result.append(still_waiting * rate)
        still_waiting *= 1 - rate
    return result


def _convolve(first: list[float], second: list[float]) -> list[float]:
    """Distribution of the sum of two independent pull counts."""
    total = [0.0] * (len(first) + len(second) - 1)
    for i, x in enumerate(first):
        for j, y in enumerate(second):
            total[i + j] += x * y
    return total


def _next_featured(banner: Banner, pity: int, guaranteed: bool) -> list[float]:
    """result[n] = chance the next featured 5-star lands exactly n pulls from now."""
    won = _next_five_star(banner, pity)
    if guaranteed:
        return won
    # Losing the 50/50 costs one more full 5-star cycle, which is then guaranteed.
    lost = _convolve(won, _next_five_star(banner, 0))
    won += [0.0] * (len(lost) - len(won))
    return [
        banner.featured_rate * w + (1 - banner.featured_rate) * x
        for w, x in zip(won, lost, strict=True)
    ]


def pull_distribution(banner: Banner, *, pity: int, guaranteed: bool, copies: int) -> list[float]:
    """result[n] = chance the last wanted copy arrives on exactly pull n."""
    result = _next_featured(banner, pity, guaranteed)
    fresh = _next_featured(banner, 0, False)
    for _ in range(copies - 1):
        result = _convolve(result, fresh)
    return result


# The common interaction changes only `pulls`, so the distribution is worth keeping.
@lru_cache(maxsize=128)
def _cumulative(banner: Banner, pity: int, guaranteed: bool, copies: int) -> tuple[float, ...]:
    return tuple(
        accumulate(pull_distribution(banner, pity=pity, guaranteed=guaranteed, copies=copies))
    )


def forecast(banner: Banner, *, pity: int, guaranteed: bool, copies: int, pulls: int) -> Forecast:
    """Odds for a player `pity` pulls into a banner. Expects 0 <= pity < hard pity, copies >= 1."""
    cumulative = _cumulative(banner, pity, guaranteed, copies)
    guaranteed_at = len(cumulative) - 1
    return Forecast(
        # Float sums stop a hair short of 1, so the certain case is answered exactly.
        probability=1.0 if pulls >= guaranteed_at else cumulative[pulls],
        guaranteed_at=guaranteed_at,
        milestones=tuple(
            Milestone(chance=chance, pulls=bisect_left(cumulative, chance))
            for chance in MILESTONE_CHANCES
        ),
    )
