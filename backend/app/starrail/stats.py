"""A character's final stats, as the game's character screen adds them up.

shortcut: only the bonuses that always apply are counted: conditional effects of light cone
passives, relic sets and traces, and teammates' buffs are left out, as on the game's own
screen. ElationDamageAddedRatioBase, AllDamageTypeAddedRatio and HealTakenRatio are skipped:
the screen shows none of them; add them when a tool needs them.
"""

from collections import defaultdict
from collections.abc import Mapping

from app.starrail.models import StarRailStat, StarRailStatKey

# Always shown, in the game's order; the elemental DMG bonuses follow when not zero.
PANEL = (
    StarRailStatKey.HP,
    StarRailStatKey.ATK,
    StarRailStatKey.DEF,
    StarRailStatKey.SPD,
    StarRailStatKey.CRIT_RATE,
    StarRailStatKey.CRIT_DMG,
    StarRailStatKey.BREAK_EFFECT,
    StarRailStatKey.OUTGOING_HEALING,
    StarRailStatKey.ENERGY_REGEN,
    StarRailStatKey.EFFECT_HIT_RATE,
    StarRailStatKey.EFFECT_RES,
)
SUMMED = {  # the stat each bonus adds to, besides HP, ATK, DEF and SPD
    "CriticalChanceBase": StarRailStatKey.CRIT_RATE,
    "CriticalDamageBase": StarRailStatKey.CRIT_DMG,
    "BreakDamageAddedRatioBase": StarRailStatKey.BREAK_EFFECT,
    "HealRatioBase": StarRailStatKey.OUTGOING_HEALING,
    "SPRatioBase": StarRailStatKey.ENERGY_REGEN,
    "StatusProbabilityBase": StarRailStatKey.EFFECT_HIT_RATE,
    "StatusResistanceBase": StarRailStatKey.EFFECT_RES,
    "PhysicalAddedRatio": StarRailStatKey.PHYSICAL_DMG,
    "FireAddedRatio": StarRailStatKey.FIRE_DMG,
    "IceAddedRatio": StarRailStatKey.ICE_DMG,
    "ThunderAddedRatio": StarRailStatKey.LIGHTNING_DMG,
    "WindAddedRatio": StarRailStatKey.WIND_DMG,
    "QuantumAddedRatio": StarRailStatKey.QUANTUM_DMG,
    "ImaginaryAddedRatio": StarRailStatKey.IMAGINARY_DMG,
}
ENERGY_REGEN_BASE = 1.0  # the screen shows 100% before any bonus


def _grown(stats: Mapping[str, float], base: str, per_level: str, level: int) -> float:
    return stats.get(base, 0.0) + stats.get(per_level, 0.0) * (level - 1)


Base = tuple[Mapping[str, float], int]  # an ascension's base stats and the level


def base_stats(
    character: Base, light_cone: Base | None, bonuses: Mapping[str, float]
) -> tuple[StarRailStat, ...]:
    """HP, ATK, DEF and SPD before any % bonus: what a "+12% SPD" is 12% of."""
    own, level = character
    cone, cone_level = light_cone or ({}, 1)

    def base(stat: str) -> float:
        """The character's base plus the light cone's."""
        own_part = _grown(own, f"{stat}Base", f"{stat}Add", level)
        return own_part + _grown(cone, f"Base{stat}", f"Base{stat}Add", cone_level)

    return (
        StarRailStat(StarRailStatKey.HP, base("HP")),
        StarRailStat(StarRailStatKey.ATK, base("Attack")),
        StarRailStat(StarRailStatKey.DEF, base("Defence")),
        StarRailStat(
            StarRailStatKey.SPD, own.get("SpeedBase", 0.0) + bonuses.get("BaseSpeed", 0.0)
        ),
    )


def final_stats(
    character: Base, light_cone: Base | None, bonuses: Mapping[str, float]
) -> tuple[StarRailStat, ...]:
    """`bonuses` sums every always-on bonus by Enka's property name."""
    own, _level = character
    bonus = defaultdict(float, bonuses)
    hp, atk, defence, spd = (stat.value for stat in base_stats(character, light_cone, bonuses))

    def scaled(stat: str, base: float) -> float:
        return base * (1 + bonus[f"{stat}AddedRatio"]) + bonus[f"{stat}Delta"]

    totals = defaultdict[StarRailStatKey, float](float)
    for prop, value in bonuses.items():
        if prop in SUMMED:
            totals[SUMMED[prop]] += value
    totals[StarRailStatKey.HP] = scaled("HP", hp)
    totals[StarRailStatKey.ATK] = scaled("Attack", atk)
    totals[StarRailStatKey.DEF] = scaled("Defence", defence)
    totals[StarRailStatKey.SPD] = scaled("Speed", spd)
    totals[StarRailStatKey.CRIT_RATE] += own.get("CriticalChance", 0.0)
    totals[StarRailStatKey.CRIT_DMG] += own.get("CriticalDamage", 0.0)
    totals[StarRailStatKey.ENERGY_REGEN] += ENERGY_REGEN_BASE
    shown = [StarRailStat(key, totals[key]) for key in PANEL]
    elements = [key for key in SUMMED.values() if key not in PANEL and totals[key]]
    shown += [StarRailStat(key, totals[key]) for key in elements]
    return tuple(shown)
