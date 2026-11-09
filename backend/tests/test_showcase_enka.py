import json
from email.message import Message
from pathlib import Path
from typing import Any, cast
from urllib.error import HTTPError, URLError
from urllib.request import Request

import pytest

from app.showcase import enka
from app.showcase.enka import EnkaError, UpstreamDataError, parse
from app.showcase.models import Artifact, Element, Showcase, Slot, Stat, StatKey, Weapon

FIXTURE = (Path(__file__).parent / "fixtures" / "enka_showcase.json").read_bytes()
UID = "700000001"


def altered(change: Any) -> bytes:
    """The fixture after `change` edited its decoded JSON in place."""
    raw = json.loads(FIXTURE)
    change(raw)
    return json.dumps(raw).encode()


def near(key: StatKey, value: float) -> Stat:
    """A stat that compares equal within float rounding."""
    return Stat(key, cast(float, pytest.approx(value)))


@pytest.fixture(scope="module")
def showcase() -> Showcase:
    return parse(UID, FIXTURE)[0]


def test_player(showcase: Showcase) -> None:
    assert (showcase.uid, showcase.nickname, showcase.adventure_rank) == (UID, "Traveler", 57)


def test_cache_lifetime_comes_from_enka() -> None:
    assert parse(UID, FIXTURE)[1] == 60


def test_character_identity(showcase: Showcase) -> None:
    amber, ganyu = showcase.characters
    assert (amber.name, amber.element) == ("Amber", Element.PYRO)
    assert (amber.level, amber.constellation) == (90, 6)
    assert (ganyu.name, ganyu.element) == ("Ganyu", Element.CRYO)
    assert (ganyu.level, ganyu.constellation) == (90, 0)


def test_talents_include_constellation_boosts(showcase: Showcase) -> None:
    amber, ganyu = showcase.characters
    assert amber.talents == (10, 13, 13)  # C3 and C5 add 3 levels each
    assert ganyu.talents == (9, 9, 9)


def test_final_stats(showcase: Showcase) -> None:
    amber = showcase.characters[0]
    assert {stat.key: stat.value for stat in amber.stats} == pytest.approx(
        {
            StatKey.HP: 14241.1758,
            StatKey.ATK: 2367.0486,
            StatKey.DEF: 951.7305,
            StatKey.ELEMENTAL_MASTERY: 39.63,
            StatKey.CRIT_RATE: 0.5194,
            StatKey.CRIT_DMG: 1.9392,
            StatKey.ENERGY_RECHARGE: 1.0,
            StatKey.PHYSICAL_DMG: 1.083,
        },
        abs=1e-4,
    )


def test_only_the_highest_damage_bonus_is_listed(showcase: Showcase) -> None:
    ganyu = showcase.characters[1]
    bonuses = [stat for stat in ganyu.stats if stat.key.endswith("_dmg") and stat.key != "crit_dmg"]
    assert bonuses == [near(StatKey.CRYO_DMG, 0.466)]


def test_weapon_refinement_is_one_based(showcase: Showcase) -> None:
    amber, ganyu = showcase.characters
    assert amber.weapon == Weapon(name="Skyward Harp", rarity=5, level=90, refinement=2)
    assert ganyu.weapon == Weapon(name="Amos' Bow", rarity=5, level=90, refinement=3)


def test_artifact_stats_are_fractions_for_percent_stats(showcase: Showcase) -> None:
    flower = showcase.characters[0].artifacts[0]
    assert flower == Artifact(
        slot=Slot.FLOWER,
        set_name="Bloodstained Chivalry",
        rarity=5,
        level=20,
        main=Stat(StatKey.HP, 4780),
        subs=(
            Stat(StatKey.DEF, 37),
            near(StatKey.ATK_PERCENT, 0.111),
            near(StatKey.CRIT_DMG, 0.187),
            Stat(StatKey.ELEMENTAL_MASTERY, 19),
        ),
    )


def test_artifacts_keep_slot_and_set(showcase: Showcase) -> None:
    ganyu = showcase.characters[1]
    assert [(artifact.slot, artifact.set_name) for artifact in ganyu.artifacts] == [
        (Slot.FLOWER, "Wanderer's Troupe"),
        (Slot.PLUME, "Wanderer's Troupe"),
        (Slot.SANDS, "Wanderer's Troupe"),
        (Slot.GOBLET, "Shimenawa's Reminiscence"),
        (Slot.CIRCLET, "Wanderer's Troupe"),
    ]
    assert ganyu.artifacts[3].main == near(StatKey.CRYO_DMG, 0.466)


def test_hidden_showcase_has_no_characters() -> None:
    showcase, _ = parse(UID, altered(lambda raw: raw.pop("avatarInfoList")))
    assert showcase.characters == ()


def test_character_newer_than_the_game_data_is_still_listed() -> None:
    def rename(raw: Any) -> None:
        raw["avatarInfoList"][0]["avatarId"] = 19999999

    newcomer = parse(UID, altered(rename))[0].characters[0]
    assert (newcomer.name, newcomer.element, newcomer.talents) == ("Unknown character", None, ())
    assert newcomer.level == 90
    assert newcomer.weapon.name == "Skyward Harp"


def unknown_stat(raw: Any) -> None:
    raw["avatarInfoList"][0]["equipList"][0]["flat"]["reliquaryMainstat"]["mainPropId"] = (
        "FIGHT_PROP_X"
    )


@pytest.mark.parametrize(
    "body",
    [
        b"not json",
        b"{}",
        b"[]",
        altered(lambda raw: raw["avatarInfoList"][0].pop("fightPropMap")),
        altered(lambda raw: raw["avatarInfoList"][0].update(equipList=[])),
        altered(unknown_stat),
    ],
    ids=["not-json", "empty", "wrong-type", "no-stats", "no-weapon", "unknown-stat"],
)
def test_unreadable_response_is_reported_not_guessed(body: bytes) -> None:
    with pytest.raises(UpstreamDataError):
        parse(UID, body)


class Reply:
    """What urlopen returns: a context manager with the response body."""

    def __enter__(self) -> "Reply":
        return self

    def __exit__(self, *args: object) -> None:
        return None

    def read(self) -> bytes:
        return b'{"ok": true}'


def test_fetch_identifies_itself_to_enka(monkeypatch: pytest.MonkeyPatch) -> None:
    seen: list[tuple[str, str | None, float]] = []

    def urlopen(request: Request, timeout: float) -> Reply:
        seen.append((request.full_url, request.get_header("User-agent"), timeout))
        return Reply()

    monkeypatch.setattr(enka, "urlopen", urlopen)
    assert enka.fetch(UID) == b'{"ok": true}'
    assert seen == [("https://enka.network/api/uid/700000001", "hoyo-toolkit", 10)]


@pytest.mark.parametrize(
    ("failure", "status"),
    [
        (HTTPError("https://enka.network", 404, "Not Found", Message(), None), 404),
        (HTTPError("https://enka.network", 429, "Too Many Requests", Message(), None), 429),
        (URLError("name resolution failed"), None),
        (TimeoutError(), None),
    ],
    ids=["not-found", "rate-limited", "unreachable", "timeout"],
)
def test_fetch_reports_every_failure_as_an_enka_error(
    monkeypatch: pytest.MonkeyPatch, failure: Exception, status: int | None
) -> None:
    def urlopen(request: Request, timeout: float) -> Reply:
        raise failure

    monkeypatch.setattr(enka, "urlopen", urlopen)
    with pytest.raises(EnkaError) as raised:
        enka.fetch(UID)
    assert raised.value.status == status
