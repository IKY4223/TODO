"""A Honkai: Star Rail character showcase, in the shape the rest of the app works with."""

from dataclasses import dataclass
from enum import StrEnum
from typing import Literal, get_args

Language = Literal["en", "ru"]
LANGUAGES: tuple[Language, ...] = get_args(Language)


class StarRailElement(StrEnum):
    PHYSICAL = "physical"
    FIRE = "fire"
    ICE = "ice"
    LIGHTNING = "lightning"
    WIND = "wind"
    QUANTUM = "quantum"
    IMAGINARY = "imaginary"


class Path(StrEnum):
    DESTRUCTION = "destruction"
    HUNT = "hunt"
    ERUDITION = "erudition"
    HARMONY = "harmony"
    NIHILITY = "nihility"
    PRESERVATION = "preservation"
    ABUNDANCE = "abundance"
    REMEMBRANCE = "remembrance"
    ELATION = "elation"


class StarRailSlot(StrEnum):  # in the game's order
    HEAD = "head"
    HANDS = "hands"
    BODY = "body"
    FEET = "feet"
    SPHERE = "sphere"
    ROPE = "rope"


class StarRailStatKey(StrEnum):
    HP = "hp"
    HP_PERCENT = "hp_percent"
    ATK = "atk"
    ATK_PERCENT = "atk_percent"
    DEF = "def"
    DEF_PERCENT = "def_percent"
    SPD = "spd"
    CRIT_RATE = "crit_rate"
    CRIT_DMG = "crit_dmg"
    EFFECT_HIT_RATE = "effect_hit_rate"
    EFFECT_RES = "effect_res"
    BREAK_EFFECT = "break_effect"
    ENERGY_REGEN = "energy_regen"
    OUTGOING_HEALING = "outgoing_healing"
    PHYSICAL_DMG = "physical_dmg"
    FIRE_DMG = "fire_dmg"
    ICE_DMG = "ice_dmg"
    LIGHTNING_DMG = "lightning_dmg"
    WIND_DMG = "wind_dmg"
    QUANTUM_DMG = "quantum_dmg"
    IMAGINARY_DMG = "imaginary_dmg"


class SkillKind(StrEnum):  # in the game's order
    BASIC = "basic"
    SKILL = "skill"
    ULTIMATE = "ultimate"
    TALENT = "talent"
    ELATION = "elation"
    MEMOSPRITE_SKILL = "memosprite_skill"
    MEMOSPRITE_TALENT = "memosprite_talent"


@dataclass(frozen=True)
class Skill:
    kind: SkillKind
    level: int  # as the game shows it, with what eidolons add
    bonus: int  # the part of the level that eidolons add


@dataclass(frozen=True)
class TracePoint:
    id: int  # the point in the character's trace tree
    level: int  # as invested: 1 for an unlocked ability or stat, the skill's own level for a skill


@dataclass(frozen=True)
class StarRailStat:
    key: StarRailStatKey
    value: float  # every stat except flat HP, ATK, DEF and SPD is a fraction: 0.0648 is 6.48%


@dataclass(frozen=True)
class SubStat(StarRailStat):
    rolls: int  # 1 when the relic dropped with it, plus one for each upgrade it received
    score: float  # the value in highest single rolls: 2.0 is two perfect rolls' worth


@dataclass(frozen=True)
class Relic:
    slot: StarRailSlot
    set_name: str
    rarity: int
    level: int  # 0 to 15 for a 5★ relic
    main: StarRailStat
    subs: tuple[SubStat, ...]
    icon: str | None


@dataclass(frozen=True)
class LightCone:
    name: str
    rarity: int
    level: int
    superimposition: int  # 1 to 5
    icon: str | None


@dataclass(frozen=True)
class StarRailCharacter:
    id: int
    name: str
    element: StarRailElement | None  # unknown for characters newer than this app's game data
    path: Path | None
    rarity: int | None
    level: int
    eidolon: int  # 0 to 6
    light_cone: LightCone | None
    relics: tuple[Relic, ...]
    skills: tuple[Skill, ...]
    points: tuple[TracePoint, ...]  # every trace point the player has unlocked
    icon: str | None


@dataclass(frozen=True)
class AccountRecord:
    achievements: int
    characters: int
    light_cones: int
    relics: int


@dataclass(frozen=True)
class StarRailShowcase:
    uid: str
    nickname: str
    signature: str
    avatar: str | None
    trailblaze_level: int
    equilibrium_level: int
    record: AccountRecord | None  # None when the player hides it
    characters: tuple[StarRailCharacter, ...]
