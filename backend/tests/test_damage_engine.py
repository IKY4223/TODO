import pytest

from app.damage.engine import Enemy, Hit, Reaction, damage
from app.showcase.models import StatKey

# A character whose numbers make every factor easy to follow by hand.
STATS = {
    StatKey.ATK: 2000.0,
    StatKey.HP: 20000.0,
    StatKey.DEF: 1000.0,
    StatKey.ELEMENTAL_MASTERY: 200.0,
    StatKey.CRIT_RATE: 0.5,
    StatKey.CRIT_DMG: 1.0,
    StatKey.PYRO_DMG: 0.466,
}
LEVEL = 90
ENEMY = Enemy(level=90, resistance=0.1)  # defense halves the hit, resistance leaves 90%
PLAIN = Hit(scaling=StatKey.ATK, multiplier=1.0, bonus=None, reaction=Reaction.NONE)


def test_plain_hit() -> None:
    # 2000 ATK x 100% x 0.5 defense x 0.9 resistance
    result = damage(LEVEL, STATS, PLAIN, ENEMY)
    assert result.non_crit == pytest.approx(900)
    assert result.crit == pytest.approx(1800)  # +100% CRIT DMG
    assert result.average == pytest.approx(1350)  # half the hits crit


def test_talent_multiplier_scales_the_hit() -> None:
    hit = Hit(scaling=StatKey.ATK, multiplier=3.92, bonus=None, reaction=Reaction.NONE)
    assert damage(LEVEL, STATS, hit, ENEMY).non_crit == pytest.approx(900 * 3.92)


@pytest.mark.parametrize(
    ("scaling", "non_crit"),
    [(StatKey.HP, 9000), (StatKey.DEF, 450), (StatKey.ELEMENTAL_MASTERY, 90)],
)
def test_hit_can_scale_with_another_stat(scaling: StatKey, non_crit: float) -> None:
    hit = Hit(scaling=scaling, multiplier=1.0, bonus=None, reaction=Reaction.NONE)
    assert damage(LEVEL, STATS, hit, ENEMY).non_crit == pytest.approx(non_crit)


def test_damage_bonus_applies_only_when_chosen() -> None:
    hit = Hit(scaling=StatKey.ATK, multiplier=1.0, bonus=StatKey.PYRO_DMG, reaction=Reaction.NONE)
    assert damage(LEVEL, STATS, hit, ENEMY).non_crit == pytest.approx(900 * 1.466)


def test_bonus_the_character_lacks_adds_nothing() -> None:
    hit = Hit(scaling=StatKey.ATK, multiplier=1.0, bonus=StatKey.CRYO_DMG, reaction=Reaction.NONE)
    assert damage(LEVEL, STATS, hit, ENEMY).non_crit == pytest.approx(900)


@pytest.mark.parametrize(
    ("reaction", "factor"),
    # 200 EM adds 2.78 x 200 / 1600 = 34.75% to the reaction.
    [(Reaction.NONE, 1.0), (Reaction.WEAK, 1.5 * 1.3475), (Reaction.STRONG, 2 * 1.3475)],
)
def test_amplifying_reaction_grows_with_elemental_mastery(
    reaction: Reaction, factor: float
) -> None:
    hit = Hit(scaling=StatKey.ATK, multiplier=1.0, bonus=None, reaction=reaction)
    assert damage(LEVEL, STATS, hit, ENEMY).non_crit == pytest.approx(900 * factor)


@pytest.mark.parametrize(
    ("crit_rate", "average"),
    [(-0.05, 900), (0.0, 900), (0.5, 1350), (1.0, 1800), (1.3, 1800)],
)
def test_crit_rate_counts_only_between_0_and_100_percent(crit_rate: float, average: float) -> None:
    stats = {**STATS, StatKey.CRIT_RATE: crit_rate}
    assert damage(LEVEL, stats, PLAIN, ENEMY).average == pytest.approx(average)


@pytest.mark.parametrize(
    ("resistance", "factor"),
    [
        (-0.2, 1.1),
        (0.0, 1.0),
        (0.1, 0.9),
        (0.74, 0.26),
        (0.75, 0.25),
        (0.9, 1 / 4.6),
        (3.0, 1 / 13),
    ],
)
def test_resistance_has_three_regimes(resistance: float, factor: float) -> None:
    enemy = Enemy(level=90, resistance=resistance)
    assert damage(LEVEL, STATS, PLAIN, enemy).non_crit == pytest.approx(2000 * 0.5 * factor)


@pytest.mark.parametrize(
    ("level", "enemy_level", "factor"),
    [(90, 90, 190 / 380), (90, 100, 190 / 390), (80, 90, 180 / 370), (1, 1, 0.5)],
)
def test_defense_depends_on_both_levels(level: int, enemy_level: int, factor: float) -> None:
    enemy = Enemy(level=enemy_level, resistance=0.0)
    assert damage(level, STATS, PLAIN, enemy).non_crit == pytest.approx(2000 * factor)


def test_missing_stats_count_as_zero() -> None:
    result = damage(LEVEL, {StatKey.ATK: 2000.0}, PLAIN, ENEMY)
    assert (result.non_crit, result.crit, result.average) == pytest.approx((900, 900, 900))
