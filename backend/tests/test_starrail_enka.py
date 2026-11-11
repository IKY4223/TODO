import json
from pathlib import Path
from typing import Any, cast

import pytest

from app.showcase.enka import UpstreamDataError
from app.starrail.enka import parse
from app.starrail.models import (
    AccountRecord,
    Skill,
    SkillKind,
    StarRailElement,
    StarRailShowcase,
    StarRailSlot,
    StarRailStatKey,
    SubStat,
)
from app.starrail.models import Path as Route

FIXTURE = (Path(__file__).parent / "fixtures" / "enka_starrail.json").read_bytes()
UID = "700000001"
ICONS = "https://enka.network/ui/hsr/SpriteOutput/"


def altered(change: Any) -> bytes:
    """The fixture after `change` edited its decoded JSON in place."""
    raw = json.loads(FIXTURE)
    change(raw)
    return json.dumps(raw).encode()


def near(value: float) -> float:
    return cast(float, pytest.approx(value, rel=1e-6))


@pytest.fixture(scope="module")
def showcase() -> StarRailShowcase:
    return parse(UID, FIXTURE)[0]


def test_player(showcase: StarRailShowcase) -> None:
    assert (showcase.uid, showcase.nickname, showcase.trailblaze_level) == (UID, "Trailblazer", 70)
    assert parse(UID, FIXTURE)[1] == 60


def test_profile(showcase: StarRailShowcase) -> None:
    assert showcase.avatar == ICONS + "AvatarRoundIcon/Avatar/8008.png"
    assert (showcase.signature, showcase.equilibrium_level) == ("Looking for co-op", 6)
    assert showcase.record == AccountRecord(
        achievements=500, characters=40, light_cones=70, relics=2400
    )


def test_profile_the_player_keeps_private() -> None:
    def hide(raw: Any) -> None:
        for key in ("headIcon", "signature", "recordInfo", "worldLevel"):
            raw["detailInfo"].pop(key)

    showcase = parse(UID, altered(hide))[0]
    assert (showcase.avatar, showcase.signature, showcase.equilibrium_level, showcase.record) == (
        None,
        "",
        0,
        None,
    )


def test_avatar_newer_than_the_game_data_has_no_image() -> None:
    showcase = parse(UID, altered(lambda raw: raw["detailInfo"].update(headIcon=299999)))[0]
    assert showcase.avatar is None


def test_skill_levels_include_what_eidolons_add(showcase: StarRailShowcase) -> None:
    hyacine, march = showcase.characters
    # Hyacine is E0: her levels are the ones she was given, memosprite skills included.
    assert hyacine.skills == (
        Skill(SkillKind.BASIC, 5, 0),
        Skill(SkillKind.SKILL, 10, 0),
        Skill(SkillKind.ULTIMATE, 10, 0),
        Skill(SkillKind.TALENT, 9, 0),
        Skill(SkillKind.MEMOSPRITE_SKILL, 6, 0),
        Skill(SkillKind.MEMOSPRITE_TALENT, 6, 0),
    )
    # March 7th is E6: E3 adds 1 to Basic ATK and 2 to Skill, E5 adds 2 to Ultimate and Talent.
    assert march.skills == (
        Skill(SkillKind.BASIC, 7, 1),
        Skill(SkillKind.SKILL, 11, 2),
        Skill(SkillKind.ULTIMATE, 10, 2),
        Skill(SkillKind.TALENT, 11, 2),
    )


def test_eidolons_not_unlocked_add_nothing() -> None:
    showcase = parse(
        UID, altered(lambda raw: raw["detailInfo"]["avatarDetailList"][1].update(rank=4))
    )[0]
    assert [skill.bonus for skill in showcase.characters[1].skills] == [1, 2, 0, 0]


def test_unknown_character_shows_the_levels_it_was_given() -> None:
    def rename(raw: Any) -> None:
        avatar = raw["detailInfo"]["avatarDetailList"][1]
        avatar["avatarId"] = 1999
        for point in avatar["skillTreeList"]:
            point["pointId"] = 1999000 + point["pointId"] % 1000

    newcomer = parse(UID, altered(rename))[0].characters[1]
    assert [(skill.level, skill.bonus) for skill in newcomer.skills] == [
        (6, 0),
        (9, 0),
        (8, 0),
        (9, 0),
    ]


def test_character_identity(showcase: StarRailShowcase) -> None:
    hyacine, march = showcase.characters
    assert (hyacine.id, hyacine.name, hyacine.rarity) == (1409, "Hyacine", 5)
    assert (hyacine.element, hyacine.path) == (StarRailElement.WIND, Route.REMEMBRANCE)
    assert (hyacine.level, hyacine.eidolon) == (80, 0)
    assert (march.name, march.element, march.path) == (
        "March 7th",
        StarRailElement.IMAGINARY,
        Route.HUNT,
    )
    assert (march.level, march.eidolon) == (71, 6)
    assert hyacine.icon == ICONS + "AvatarRoundIcon/Avatar/1409.png"


def test_light_cone(showcase: StarRailShowcase) -> None:
    cone = showcase.characters[0].light_cone
    assert cone is not None
    assert (cone.name, cone.level, cone.superimposition, cone.rarity) == (
        "The Story's Next Page",
        70,
        1,
        4,
    )
    assert cone.icon == ICONS + "ItemIcon/LightConeIcons/21054.png"


def test_relics_keep_their_slot_and_set(showcase: StarRailShowcase) -> None:
    relics = showcase.characters[0].relics
    assert [relic.slot for relic in relics] == list(StarRailSlot)
    assert [relic.set_name for relic in relics] == ["Warrior Goddess of Sun and Thunder"] * 4 + [
        "Giant Tree of Rapt Brooding"
    ] * 2
    assert all((relic.level, relic.rarity) == (15, 5) for relic in relics)


def test_stats_match_what_the_game_shows(showcase: StarRailShowcase) -> None:
    """Values are computed from the game's affix tables; Enka's own computed values must agree."""
    raw = json.loads(FIXTURE)["detailInfo"]["avatarDetailList"]
    for character, avatar in zip(showcase.characters, raw, strict=True):
        for relic, source in zip(character.relics, avatar["relicList"], strict=True):
            shown = [prop["value"] for prop in source["_flat"]["props"]]
            assert [relic.main.value, *(sub.value for sub in relic.subs)] == [
                near(v) for v in shown
            ]


def test_substats_carry_their_roll_counts(showcase: StarRailShowcase) -> None:
    head = showcase.characters[0].relics[0]
    assert head.main.key == StarRailStatKey.HP
    assert head.subs == (
        SubStat(StarRailStatKey.ATK, near(40.220669), 2, near(40.220669 / 21.168773)),
        SubStat(StarRailStatKey.SPD, near(12.1), 5, near(12.1 / 2.6)),
        SubStat(StarRailStatKey.EFFECT_HIT_RATE, near(0.03456), 1, near(0.8)),
        SubStat(StarRailStatKey.BREAK_EFFECT, near(0.05832), 1, near(0.9)),
    )


def test_main_stats_cover_every_slot_kind(showcase: StarRailShowcase) -> None:
    mains = [relic.main.key for relic in showcase.characters[0].relics]
    assert mains == [
        StarRailStatKey.HP,
        StarRailStatKey.ATK,
        StarRailStatKey.OUTGOING_HEALING,
        StarRailStatKey.SPD,
        StarRailStatKey.HP_PERCENT,
        StarRailStatKey.ENERGY_REGEN,
    ]


def test_hidden_showcase_has_no_characters() -> None:
    showcase, _ = parse(UID, altered(lambda raw: raw["detailInfo"].pop("avatarDetailList")))
    assert showcase.characters == ()


def test_character_without_a_light_cone() -> None:
    showcase, _ = parse(
        UID, altered(lambda raw: raw["detailInfo"]["avatarDetailList"][0].pop("equipment"))
    )
    assert showcase.characters[0].light_cone is None


def test_character_newer_than_the_game_data_is_still_listed() -> None:
    def rename(raw: Any) -> None:
        avatar = raw["detailInfo"]["avatarDetailList"][0]
        avatar["avatarId"] = 1999
        avatar["equipment"]["tid"] = 29999
        avatar["relicList"][0]["tid"] = 69999

    newcomer = parse(UID, altered(rename))[0].characters[0]
    assert (newcomer.id, newcomer.name, newcomer.element, newcomer.path, newcomer.icon) == (
        1999,
        "Unknown character",
        None,
        None,
        None,
    )
    assert newcomer.light_cone is not None
    assert newcomer.light_cone.name == "Unknown light cone"
    assert len(newcomer.relics) == 5  # a relic this app cannot read is left out, not guessed


@pytest.mark.parametrize(
    "body",
    [
        b"not json",
        b"{}",
        altered(lambda raw: raw["detailInfo"]["avatarDetailList"][0].pop("level")),
        altered(
            lambda raw: raw["detailInfo"]["avatarDetailList"][0]["relicList"][0].update(
                mainAffixId=999
            )
        ),
    ],
    ids=["not-json", "empty", "no-level", "unknown-main-stat"],
)
def test_unreadable_response_is_reported_not_guessed(body: bytes) -> None:
    with pytest.raises(UpstreamDataError):
        parse(UID, body)
