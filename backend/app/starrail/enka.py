"""Enka.Network's Honkai: Star Rail showcase, converted to this app's model."""

import re

from pydantic import Field, ValidationError

from app.showcase.enka import DEFAULT_TTL_SECONDS, EnkaModel, UpstreamDataError
from app.starrail.gamedata import GAMEDATA
from app.starrail.models import (
    LANGUAGES,
    AccountRecord,
    Language,
    LightCone,
    Path,
    Relic,
    Skill,
    SkillKind,
    StarRailCharacter,
    StarRailElement,
    StarRailShowcase,
    StarRailSlot,
    StarRailStat,
    StarRailStatKey,
    SubStat,
    TracePoint,
)

ENKA_URL = "https://enka.network/api/hsr/uid/{uid}"
IMAGE_HOST = "https://enka.network"

UNKNOWN_CHARACTER = "Unknown character"
UNKNOWN_LIGHT_CONE = "Unknown light cone"
UNKNOWN_SET = "Unknown set"

# A path under Enka's Star Rail images, like "/ui/hsr/SpriteOutput/AvatarRoundIcon/1409.png";
# rejects "/ui/hsr/../x.png" and "/ui/hsr/a.png?b".
# https://regex101.com/?flavor=python&regex=%5E%2Fui%2Fhsr%2F%5B%5Cw%2F%5D%2B%5C.png%24&flags=am&testString=%2Fui%2Fhsr%2FSpriteOutput%2FAvatarRoundIcon%2F1409.png%0A%2Fui%2Fhsr%2F..%2Fx.png%0A%2Fui%2Fhsr%2Fa.png%3Fb
ICON_PATH = re.compile(r"/ui/hsr/[\w/]+\.png", re.ASCII)

ELEMENTS = {
    "Physical": StarRailElement.PHYSICAL,
    "Fire": StarRailElement.FIRE,
    "Ice": StarRailElement.ICE,
    "Thunder": StarRailElement.LIGHTNING,
    "Wind": StarRailElement.WIND,
    "Quantum": StarRailElement.QUANTUM,
    "Imaginary": StarRailElement.IMAGINARY,
}
PATHS = {  # the game's internal names
    "Warrior": Path.DESTRUCTION,
    "Rogue": Path.HUNT,
    "Mage": Path.ERUDITION,
    "Shaman": Path.HARMONY,
    "Warlock": Path.NIHILITY,
    "Knight": Path.PRESERVATION,
    "Priest": Path.ABUNDANCE,
    "Memory": Path.REMEMBRANCE,
    "Elation": Path.ELATION,
}
SLOTS = {
    "HEAD": StarRailSlot.HEAD,
    "HAND": StarRailSlot.HANDS,
    "BODY": StarRailSlot.BODY,
    "FOOT": StarRailSlot.FEET,
    "NECK": StarRailSlot.SPHERE,
    "OBJECT": StarRailSlot.ROPE,
}
# A skill tree point's id ends in the same three digits for every character: 1409003 and
# 11004003 are both an Ultimate. Points not listed are traces and the technique.
SKILLS = {  # in the game's order
    1: SkillKind.BASIC,
    2: SkillKind.SKILL,
    3: SkillKind.ULTIMATE,
    4: SkillKind.TALENT,
    420: SkillKind.ELATION,
    301: SkillKind.MEMOSPRITE_SKILL,
    302: SkillKind.MEMOSPRITE_TALENT,
}
PROPERTIES = {
    "HPDelta": StarRailStatKey.HP,
    "HPAddedRatio": StarRailStatKey.HP_PERCENT,
    "AttackDelta": StarRailStatKey.ATK,
    "AttackAddedRatio": StarRailStatKey.ATK_PERCENT,
    "DefenceDelta": StarRailStatKey.DEF,
    "DefenceAddedRatio": StarRailStatKey.DEF_PERCENT,
    "SpeedDelta": StarRailStatKey.SPD,
    "CriticalChanceBase": StarRailStatKey.CRIT_RATE,
    "CriticalDamageBase": StarRailStatKey.CRIT_DMG,
    "StatusProbabilityBase": StarRailStatKey.EFFECT_HIT_RATE,
    "StatusResistanceBase": StarRailStatKey.EFFECT_RES,
    "BreakDamageAddedRatioBase": StarRailStatKey.BREAK_EFFECT,
    "SPRatioBase": StarRailStatKey.ENERGY_REGEN,
    "HealRatioBase": StarRailStatKey.OUTGOING_HEALING,
    "PhysicalAddedRatio": StarRailStatKey.PHYSICAL_DMG,
    "FireAddedRatio": StarRailStatKey.FIRE_DMG,
    "IceAddedRatio": StarRailStatKey.ICE_DMG,
    "ThunderAddedRatio": StarRailStatKey.LIGHTNING_DMG,
    "WindAddedRatio": StarRailStatKey.WIND_DMG,
    "QuantumAddedRatio": StarRailStatKey.QUANTUM_DMG,
    "ImaginaryAddedRatio": StarRailStatKey.IMAGINARY_DMG,
}


class _SubAffix(EnkaModel):
    affix_id: int
    cnt: int
    step: int = 0  # Enka leaves it out when it is zero


class _Relic(EnkaModel):
    tid: int
    level: int = 0
    main_affix_id: int
    sub_affix_list: list[_SubAffix] = Field(default_factory=list)


class _Equipment(EnkaModel):
    tid: int
    level: int = 1
    rank: int = 1


class _SkillTreePoint(EnkaModel):
    point_id: int
    level: int  # what the player gave it; eidolons add on top in the game


class _Avatar(EnkaModel):
    avatar_id: int
    level: int
    rank: int = 0  # eidolon; Enka leaves it out at 0
    equipment: _Equipment | None = None
    relic_list: list[_Relic] = Field(default_factory=list)
    skill_tree_list: list[_SkillTreePoint] = Field(default_factory=list)


class _Record(EnkaModel):
    achievement_count: int = 0
    avatar_count: int = 0
    equipment_count: int = 0
    relic_count: int = 0


class _Detail(EnkaModel):
    nickname: str = ""
    signature: str = ""
    head_icon: int | None = None
    level: int
    world_level: int = 0
    record_info: _Record | None = None  # missing when the player hides it
    # Missing when the showcase is hidden.
    avatar_detail_list: list[_Avatar] = Field(default_factory=list)


class _Response(EnkaModel):
    detail_info: _Detail
    ttl: int = DEFAULT_TTL_SECONDS


def _icon(path: str | None) -> str | None:
    """The image URL, unless the path could make the URL point anywhere but one Enka image."""
    return IMAGE_HOST + path if path and ICON_PATH.fullmatch(path) else None


def _relic(relic: _Relic, language: Language) -> Relic | None:
    """None for a relic newer than this app's game data."""
    data = GAMEDATA.relics.get(str(relic.tid))
    if data is None:
        return None
    prop, base, per_level = GAMEDATA.main_affixes[str(data.main_group)][str(relic.main_affix_id)]
    subs = GAMEDATA.sub_affixes[str(data.sub_group)]
    return Relic(
        slot=SLOTS[data.slot],
        set_name=GAMEDATA.sets.get(str(data.set), {}).get(language, UNKNOWN_SET),
        rarity=data.rarity,
        level=relic.level,
        main=StarRailStat(PROPERTIES[prop], base + per_level * relic.level),
        subs=tuple(_sub(*subs[str(sub.affix_id)], sub) for sub in relic.sub_affix_list),
        icon=_icon(data.icon),
    )


def _sub(prop: str, per_roll: float, per_step: float, sub: _SubAffix) -> SubStat:
    # Each roll adds the base value plus 0, 1 or 2 steps; `step` totals them.
    value = per_roll * sub.cnt + per_step * sub.step
    return SubStat(PROPERTIES[prop], value, sub.cnt, value / (per_roll + 2 * per_step))


def _light_cone(equipment: _Equipment | None, language: Language) -> LightCone | None:
    if equipment is None:
        return None
    data = GAMEDATA.light_cones.get(str(equipment.tid))
    return LightCone(
        name=data.name[language] if data else UNKNOWN_LIGHT_CONE,
        rarity=data.rarity if data else 0,
        level=equipment.level,
        superimposition=equipment.rank,
        icon=_icon(data.icon) if data else None,
    )


def _skills(avatar: _Avatar, eidolons: list[dict[int, int]]) -> tuple[Skill, ...]:
    """Skills in the game's order. Without game data for the character, eidolons add nothing."""
    levels = {point.point_id % 1000: point.level for point in avatar.skill_tree_list}
    unlocked = eidolons[: avatar.rank]
    skills = []
    for point, kind in SKILLS.items():
        if point in levels:
            bonus = sum(eidolon.get(point, 0) for eidolon in unlocked)
            skills.append(Skill(kind, levels[point] + bonus, bonus))
    return tuple(skills)


def _character(avatar: _Avatar, language: Language) -> StarRailCharacter:
    data = GAMEDATA.characters.get(str(avatar.avatar_id))
    relics = (_relic(relic, language) for relic in avatar.relic_list)
    return StarRailCharacter(
        id=avatar.avatar_id,
        name=data.name[language] if data else UNKNOWN_CHARACTER,
        element=ELEMENTS[data.element] if data else None,
        path=PATHS[data.path] if data else None,
        rarity=data.rarity if data else None,
        level=avatar.level,
        eidolon=avatar.rank,
        light_cone=_light_cone(avatar.equipment, language),
        relics=tuple(relic for relic in relics if relic),
        skills=_skills(avatar, data.eidolons if data else []),
        points=tuple(TracePoint(point.point_id, point.level) for point in avatar.skill_tree_list),
        icon=_icon(data.icon) if data else None,
    )


def _record(record: _Record | None) -> AccountRecord | None:
    if record is None:
        return None
    return AccountRecord(
        achievements=record.achievement_count,
        characters=record.avatar_count,
        light_cones=record.equipment_count,
        relics=record.relic_count,
    )


def parse_all(uid: str, body: bytes) -> tuple[dict[Language, StarRailShowcase], int]:
    """Convert an Enka response into a showcase per language, and the seconds to cache them for.

    Every language at once: one Enka request then serves a player who switches language.
    """
    try:
        response = _Response.model_validate_json(body)
        detail = response.detail_info
        characters = {
            language: tuple(_character(avatar, language) for avatar in detail.avatar_detail_list)
            for language in LANGUAGES
        }
    except (KeyError, ValidationError) as error:
        raise UpstreamDataError(f"unreadable Enka Star Rail response for {uid}") from error
    avatar = GAMEDATA.profile_icons.get(str(detail.head_icon))
    showcases = {
        language: StarRailShowcase(
            uid=uid,
            nickname=detail.nickname,
            signature=detail.signature,
            avatar=_icon(avatar),
            trailblaze_level=detail.level,
            equilibrium_level=detail.world_level,
            record=_record(detail.record_info),
            characters=characters[language],
        )
        for language in LANGUAGES
    }
    return showcases, response.ttl


def parse(uid: str, body: bytes, language: Language = "en") -> tuple[StarRailShowcase, int]:
    """One language's showcase and the seconds it may be cached for."""
    showcases, ttl = parse_all(uid, body)
    return showcases[language], ttl
