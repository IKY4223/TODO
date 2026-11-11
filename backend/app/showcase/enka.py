"""Enka.Network client: fetches a player's showcase and converts it to this app's model."""

import re
from urllib.error import HTTPError
from urllib.request import Request, urlopen

from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel

from app.showcase.gamedata import GAMEDATA
from app.showcase.models import Artifact, Character, Showcase, Slot, Stat, StatKey, Weapon

ENKA_URL = "https://enka.network/api/uid/{uid}"
ICON_URL = "https://enka.network/ui/{name}.png"
USER_AGENT = "hoyo-toolkit"  # Enka asks every client to identify itself
TIMEOUT_SECONDS = 10
MAX_RESPONSE_BYTES = 2_000_000  # a full showcase is about 100 kB
DEFAULT_TTL_SECONDS = 60

UNKNOWN_CHARACTER = "Unknown character"
UNKNOWN_WEAPON = "Unknown weapon"
UNKNOWN_SET = "Unknown set"
LEVEL_PROP = "4001"

# Letters, digits and underscores, like "UI_RelicIcon_15008_4"; rejects "../x" and "a.png?b".
# https://regex101.com/?flavor=python&regex=%5Cw%2B&flags=a&testString=UI_RelicIcon_15008_4%0A..%2Fx%0Aa.png%3Fb
ICON_NAME = re.compile(r"\w+", re.ASCII)

FIGHT_PROPS = {
    "FIGHT_PROP_HP": StatKey.HP,
    "FIGHT_PROP_HP_PERCENT": StatKey.HP_PERCENT,
    "FIGHT_PROP_ATTACK": StatKey.ATK,
    "FIGHT_PROP_ATTACK_PERCENT": StatKey.ATK_PERCENT,
    "FIGHT_PROP_DEFENSE": StatKey.DEF,
    "FIGHT_PROP_DEFENSE_PERCENT": StatKey.DEF_PERCENT,
    "FIGHT_PROP_ELEMENT_MASTERY": StatKey.ELEMENTAL_MASTERY,
    "FIGHT_PROP_CHARGE_EFFICIENCY": StatKey.ENERGY_RECHARGE,
    "FIGHT_PROP_CRITICAL": StatKey.CRIT_RATE,
    "FIGHT_PROP_CRITICAL_HURT": StatKey.CRIT_DMG,
    "FIGHT_PROP_HEAL_ADD": StatKey.HEALING_BONUS,
    "FIGHT_PROP_PHYSICAL_ADD_HURT": StatKey.PHYSICAL_DMG,
    "FIGHT_PROP_FIRE_ADD_HURT": StatKey.PYRO_DMG,
    "FIGHT_PROP_WATER_ADD_HURT": StatKey.HYDRO_DMG,
    "FIGHT_PROP_ELEC_ADD_HURT": StatKey.ELECTRO_DMG,
    "FIGHT_PROP_ICE_ADD_HURT": StatKey.CRYO_DMG,
    "FIGHT_PROP_WIND_ADD_HURT": StatKey.ANEMO_DMG,
    "FIGHT_PROP_ROCK_ADD_HURT": StatKey.GEO_DMG,
    "FIGHT_PROP_GRASS_ADD_HURT": StatKey.DENDRO_DMG,
}
FLAT_STATS = frozenset({StatKey.HP, StatKey.ATK, StatKey.DEF, StatKey.ELEMENTAL_MASTERY})

# Ids in a character's fightPropMap, which holds final values with percent stats as fractions.
TOTALS = {
    "2000": StatKey.HP,
    "2001": StatKey.ATK,
    "2002": StatKey.DEF,
    "28": StatKey.ELEMENTAL_MASTERY,
    "20": StatKey.CRIT_RATE,
    "22": StatKey.CRIT_DMG,
    "23": StatKey.ENERGY_RECHARGE,
}
DMG_BONUSES = {
    "30": StatKey.PHYSICAL_DMG,
    "40": StatKey.PYRO_DMG,
    "41": StatKey.ELECTRO_DMG,
    "42": StatKey.HYDRO_DMG,
    "43": StatKey.DENDRO_DMG,
    "44": StatKey.ANEMO_DMG,
    "45": StatKey.GEO_DMG,
    "46": StatKey.CRYO_DMG,
}
SLOTS = {
    "EQUIP_BRACER": Slot.FLOWER,
    "EQUIP_NECKLACE": Slot.PLUME,
    "EQUIP_SHOES": Slot.SANDS,
    "EQUIP_RING": Slot.GOBLET,
    "EQUIP_DRESS": Slot.CIRCLET,
}


class EnkaError(Exception):
    """Enka.Network refused the request (`status`) or did not answer (`status` is None)."""

    def __init__(self, status: int | None) -> None:
        super().__init__(f"Enka.Network request failed: {status or 'no response'}")
        self.status = status


class UpstreamDataError(Exception):
    """Enka.Network answered with data this app cannot read."""


class EnkaModel(BaseModel):
    """Only the fields this app reads. Enka's JSON is camelCase."""

    model_config = ConfigDict(alias_generator=to_camel)


class _Prop(EnkaModel):
    val: str = "0"  # Enka leaves the value out when it is zero


class _MainStat(EnkaModel):
    main_prop_id: str
    stat_value: float


class _SubStat(EnkaModel):
    append_prop_id: str
    stat_value: float


class _ArtifactFlat(EnkaModel):
    icon: str | None = None
    rank_level: int
    equip_type: str
    set_id: int
    reliquary_mainstat: _MainStat
    reliquary_substats: list[_SubStat] = []


class _Reliquary(EnkaModel):
    level: int


class _Artifact(EnkaModel):
    reliquary: _Reliquary
    flat: _ArtifactFlat


class _WeaponFlat(EnkaModel):
    icon: str | None = None
    rank_level: int


class _WeaponInfo(EnkaModel):
    level: int
    affix_map: dict[str, int] = {}


class _Weapon(EnkaModel):
    item_id: int
    weapon: _WeaponInfo
    flat: _WeaponFlat


class _Avatar(EnkaModel):
    avatar_id: int
    skill_depot_id: int
    prop_map: dict[str, _Prop]
    fight_prop_map: dict[str, float]
    skill_level_map: dict[str, int]
    proud_skill_extra_level_map: dict[str, int] = {}
    talent_id_list: list[int] = []
    equip_list: list[_Artifact | _Weapon]


class _Player(EnkaModel):
    nickname: str = ""
    level: int


class _Response(EnkaModel):
    player_info: _Player
    avatar_info_list: list[_Avatar] | None = None  # missing when the showcase is hidden
    ttl: int = DEFAULT_TTL_SECONDS


def fetch(uid: str, url: str = ENKA_URL) -> bytes:
    """Download the raw showcase. `uid` must already be validated: it becomes part of the URL.

    `url` is a constant https address template, one per game.
    """
    # S310 guards against file: and custom schemes; every caller passes a constant https URL.
    request = Request(url.format(uid=uid), headers={"User-Agent": USER_AGENT})  # noqa: S310
    try:
        with urlopen(request, timeout=TIMEOUT_SECONDS) as response:  # noqa: S310
            body: bytes = response.read(MAX_RESPONSE_BYTES + 1)
    except HTTPError as error:
        raise EnkaError(error.code) from error
    except OSError as error:  # no connection, DNS failure, timeout
        raise EnkaError(None) from error
    if len(body) > MAX_RESPONSE_BYTES:
        raise UpstreamDataError(f"Enka response for {uid} is larger than a showcase can be")
    return body


def _icon(name: str | None) -> str | None:
    """The image URL, unless the name could make the URL point anywhere but one Enka image."""
    return ICON_URL.format(name=name) if name and ICON_NAME.fullmatch(name) else None


def _stat(prop: str, value: float) -> Stat:
    key = FIGHT_PROPS[prop]
    return Stat(key, value if key in FLAT_STATS else value / 100)


def _artifact(item: _Artifact) -> Artifact:
    flat = item.flat
    return Artifact(
        slot=SLOTS[flat.equip_type],
        set_name=GAMEDATA.sets.get(str(flat.set_id), UNKNOWN_SET),
        rarity=flat.rank_level,
        level=item.reliquary.level - 1,  # Enka counts artifact levels from 1
        main=_stat(flat.reliquary_mainstat.main_prop_id, flat.reliquary_mainstat.stat_value),
        subs=tuple(_stat(sub.append_prop_id, sub.stat_value) for sub in flat.reliquary_substats),
        icon=_icon(flat.icon),
    )


def _weapon(item: _Weapon) -> Weapon:
    return Weapon(
        name=GAMEDATA.weapons.get(str(item.item_id), UNKNOWN_WEAPON),
        rarity=item.flat.rank_level,
        level=item.weapon.level,
        refinement=1 + next(iter(item.weapon.affix_map.values()), 0),  # Enka counts from 0
        icon=_icon(item.flat.icon),
    )


def _stats(fight: dict[str, float]) -> tuple[Stat, ...]:
    totals = [Stat(key, fight.get(prop, 0.0)) for prop, key in TOTALS.items()]
    bonuses = [Stat(key, fight[prop]) for prop, key in DMG_BONUSES.items() if fight.get(prop)]
    return (*totals, *bonuses)


def _character(avatar: _Avatar) -> Character:
    # The Traveler has one entry per element, told apart by skill depot.
    data = GAMEDATA.characters.get(
        f"{avatar.avatar_id}-{avatar.skill_depot_id}"
    ) or GAMEDATA.characters.get(str(avatar.avatar_id))
    weapons = [item for item in avatar.equip_list if isinstance(item, _Weapon)]
    if not weapons:
        raise ValueError(f"character {avatar.avatar_id} has no weapon")
    return Character(
        id=avatar.avatar_id,
        name=data.name if data else UNKNOWN_CHARACTER,
        element=data.element if data else None,
        level=int(avatar.prop_map[LEVEL_PROP].val),
        constellation=len(avatar.talent_id_list),
        talents=tuple(
            avatar.skill_level_map[str(talent)]
            + avatar.proud_skill_extra_level_map.get(str(boost), 0)
            for talent, boost in (data.talents if data else [])
        ),
        stats=_stats(avatar.fight_prop_map),
        weapon=_weapon(weapons[0]),
        artifacts=tuple(
            _artifact(item) for item in avatar.equip_list if isinstance(item, _Artifact)
        ),
        icon=_icon(data.icon) if data else None,
    )


def parse(uid: str, body: bytes) -> tuple[Showcase, int]:
    """Convert an Enka response into a showcase and the seconds it may be cached for."""
    try:
        response = _Response.model_validate_json(body)
        characters = tuple(_character(avatar) for avatar in response.avatar_info_list or [])
    except (KeyError, ValueError) as error:  # ValueError covers pydantic's ValidationError
        raise UpstreamDataError(f"unreadable Enka response for {uid}") from error
    showcase = Showcase(
        uid=uid,
        nickname=response.player_info.nickname,
        adventure_rank=response.player_info.level,
        characters=characters,
    )
    return showcase, response.ttl
