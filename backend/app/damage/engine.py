"""Outgoing damage of one hit.

The game does not publish its damage formula. This is the community one, verified by player
testing (KQM Theorycrafting Library, "Damage Formula").

shortcut: defense and resistance shred, flat damage additions (Shenhe, Aggravate, Spread) and
transformative reactions are not modelled; add each when a feature needs it.
"""

from collections.abc import Mapping
from dataclasses import dataclass
from enum import StrEnum

from app.showcase.models import StatKey


class Reaction(StrEnum):
    NONE = "none"
    WEAK = "weak"  # x1.5: Pyro on Hydro (Vaporize), Cryo on Pyro (Melt)
    STRONG = "strong"  # x2: Hydro on Pyro (Vaporize), Pyro on Cryo (Melt)


@dataclass(frozen=True)
class Hit:
    scaling: StatKey  # the stat the talent multiplies
    multiplier: float  # talent multiplier: 3.92 for 392%
    bonus: StatKey | None  # the damage bonus that applies, such as pyro_dmg
    reaction: Reaction


@dataclass(frozen=True)
class Enemy:
    level: int
    resistance: float  # to the hit's damage type: 0.1 for 10%


@dataclass(frozen=True)
class Damage:
    non_crit: float
    crit: float
    average: float  # over many hits at the character's CRIT Rate


REACTION_MULTIPLIERS = {Reaction.WEAK: 1.5, Reaction.STRONG: 2.0}
# Resistance at or above this is divided down instead of subtracted.
HIGH_RESISTANCE = 0.75


def _defense_factor(level: int, enemy_level: int) -> float:
    return (level + 100) / (level + enemy_level + 200)


def _resistance_factor(resistance: float) -> float:
    if resistance < 0:
        return 1 - resistance / 2  # negative resistance is worth half
    if resistance < HIGH_RESISTANCE:
        return 1 - resistance
    return 1 / (4 * resistance + 1)


def _reaction_factor(reaction: Reaction, mastery: float) -> float:
    if reaction is Reaction.NONE:
        return 1.0
    return REACTION_MULTIPLIERS[reaction] * (1 + 2.78 * mastery / (mastery + 1400))


def damage(level: int, stats: Mapping[StatKey, float], hit: Hit, enemy: Enemy) -> Damage:
    """Damage one hit deals. `stats` are the character's final values; a missing stat is 0."""
    bonus = stats.get(hit.bonus, 0.0) if hit.bonus else 0.0
    non_crit = (
        stats.get(hit.scaling, 0.0)
        * hit.multiplier
        * (1 + bonus)
        * _reaction_factor(hit.reaction, stats.get(StatKey.ELEMENTAL_MASTERY, 0.0))
        * _defense_factor(level, enemy.level)
        * _resistance_factor(enemy.resistance)
    )
    crit_dmg = stats.get(StatKey.CRIT_DMG, 0.0)
    crit_rate = min(1.0, max(0.0, stats.get(StatKey.CRIT_RATE, 0.0)))
    return Damage(
        non_crit=non_crit,
        crit=non_crit * (1 + crit_dmg),
        average=non_crit * (1 + crit_rate * crit_dmg),
    )
