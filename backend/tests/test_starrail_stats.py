import json
from collections.abc import Callable
from pathlib import Path
from typing import Any

import pytest

from app.starrail.enka import parse
from app.starrail.models import StarRailStat
from app.starrail.models import StarRailStatKey as Stat
from app.starrail.stats import base_stats, final_stats

FIXTURE = (Path(__file__).parent / "fixtures" / "enka_starrail.json").read_bytes()
OWN = {
    "HPBase": 100.0,
    "HPAdd": 10.0,
    "AttackBase": 50.0,
    "AttackAdd": 5.0,
    "DefenceBase": 40.0,
    "DefenceAdd": 4.0,
    "SpeedBase": 100.0,
    "CriticalChance": 0.05,
    "CriticalDamage": 0.5,
}
CONE = {"BaseHP": 200.0, "BaseHPAdd": 2.0, "BaseAttack": 20.0, "BaseAttackAdd": 1.0}


def shown(stats: tuple[StarRailStat, ...]) -> dict[str, float]:
    return {stat.key.value: stat.value for stat in stats}


def test_percent_bonuses_raise_the_base_of_character_and_light_cone_together() -> None:
    bonuses = {"HPAddedRatio": 0.5, "HPDelta": 30.0, "AttackAddedRatio": 0.1, "AttackDelta": 5.0}
    stats = shown(final_stats((OWN, 11), (CONE, 21), bonuses))
    # HP: (100 + 10 * 10 + 200 + 2 * 20) * 1.5 + 30; ATK: (50 + 50 + 20 + 20) * 1.1 + 5
    assert stats["hp"] == pytest.approx(690)
    assert stats["atk"] == pytest.approx(159)
    assert stats["def"] == pytest.approx(80)


def test_speed_crit_and_energy_regen_start_from_their_base() -> None:
    bonuses = {
        "SpeedAddedRatio": -0.08,
        "SpeedDelta": 25.0,
        "BaseSpeed": 10.0,
        "CriticalChanceBase": 0.1,
        "SPRatioBase": 0.194,
        "QuantumAddedRatio": 0.1,
    }
    stats = shown(final_stats((OWN, 1), None, bonuses))
    assert stats["spd"] == pytest.approx(110 * 0.92 + 25)
    assert stats["crit_rate"] == pytest.approx(0.15)
    assert stats["crit_dmg"] == 0.5
    assert stats["energy_regen"] == pytest.approx(1.194)  # the game shows 119.4%
    assert stats["quantum_dmg"] == pytest.approx(0.1)
    assert "fire_dmg" not in stats  # an element without a bonus is left out


def test_the_panel_always_lists_the_same_stats_first() -> None:
    keys = [stat.key for stat in final_stats((OWN, 1), None, {})]
    assert keys[:4] == [Stat.HP, Stat.ATK, Stat.DEF, Stat.SPD]
    assert len(keys) == 11


def test_showcase_characters_carry_final_stats() -> None:
    hyacine, march = parse("700000001", FIXTURE)[0].characters
    stats = shown(hyacine.stats)
    # Hyacine's base SPD is 110; relics, traces and sets only add to it.
    assert stats["spd"] > 110
    assert stats["crit_rate"] >= 0.05
    assert shown(march.stats)["imaginary_dmg"] > 0  # her trace and sphere


def hyacine_with(change: Callable[[Any], None]) -> dict[str, float]:
    raw = json.loads(FIXTURE)
    change(raw["detailInfo"]["avatarDetailList"][0])
    return shown(parse("700000001", json.dumps(raw).encode())[0].characters[0].stats)


def test_traces_sets_and_light_cone_passive_all_count() -> None:
    def bare(avatar: Any) -> None:
        avatar.update(skillTreeList=[], relicList=[])
        avatar.pop("equipment")

    plain = hyacine_with(lambda _avatar: None)
    stripped = hyacine_with(bare)
    assert stripped["spd"] == pytest.approx(110)
    assert stripped["energy_regen"] == pytest.approx(1)
    assert plain["hp"] > stripped["hp"]


def test_a_set_bonus_needs_its_pieces() -> None:
    # Warrior Goddess of Sun and Thunder: SPD +6% from 2 pieces. One piece gives nothing.
    def head_only(avatar: Any) -> None:
        avatar.update(skillTreeList=[], relicList=avatar["relicList"][:1])
        avatar.pop("equipment")

    def two_pieces(avatar: Any) -> None:
        avatar.update(skillTreeList=[], relicList=avatar["relicList"][:2])
        avatar.pop("equipment")

    relics = parse("700000001", FIXTURE)[0].characters[0].relics

    def flat_speed(count: int) -> float:
        return sum(
            sub.value for relic in relics[:count] for sub in relic.subs if sub.key == Stat.SPD
        )

    assert hyacine_with(head_only)["spd"] == pytest.approx(110 + flat_speed(1))
    assert hyacine_with(two_pieces)["spd"] == pytest.approx(110 * 1.06 + flat_speed(2))


def test_unknown_character_has_no_final_stats() -> None:
    raw = json.loads(FIXTURE)
    raw["detailInfo"]["avatarDetailList"][0]["avatarId"] = 1999
    assert parse("700000001", json.dumps(raw).encode())[0].characters[0].stats == ()


def test_bases_are_what_percent_bonuses_multiply() -> None:
    bonuses = {"HPAddedRatio": 0.5, "BaseSpeed": 12.0, "SpeedAddedRatio": 0.1}
    bases = {stat.key: stat.value for stat in base_stats((OWN, 11), (CONE, 21), bonuses)}
    assert bases == {Stat.HP: 440, Stat.ATK: 140, Stat.DEF: 80, Stat.SPD: 112}
    final = shown(final_stats((OWN, 11), (CONE, 21), bonuses))
    assert final["spd"] == pytest.approx(112 * 1.1)


def test_showcase_characters_carry_ids_for_their_effects() -> None:
    hyacine = parse("700000001", FIXTURE)[0].characters[0]
    assert hyacine.light_cone is not None
    assert hyacine.light_cone.id == 21054
    assert [relic.set_id for relic in hyacine.relics] == [125] * 4 + [320] * 2
    assert [stat.key for stat in hyacine.bases] == [Stat.HP, Stat.ATK, Stat.DEF, Stat.SPD]
    assert hyacine.bases[3].value == 110
