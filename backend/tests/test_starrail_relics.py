import random
from math import comb

import pytest

from app.starrail.models import StarRailStatKey as Stat
from app.starrail.relics import SUBSTAT_WEIGHTS, RelicError, forecast

FOUR = (Stat.ATK, Stat.DEF, Stat.SPD, Stat.CRIT_RATE)


def binomial(trials: int, chance: float) -> list[float]:
    return [
        comb(trials, hits) * chance**hits * (1 - chance) ** (trials - hits)
        for hits in range(trials + 1)
    ]


def near(values: list[float]) -> object:
    return pytest.approx(values, abs=1e-12)


def test_weights_are_the_community_table() -> None:
    assert sum(SUBSTAT_WEIGHTS.values()) == 100
    assert len(SUBSTAT_WEIGHTS) == 12


def test_four_substats_each_upgrade_picks_one_evenly() -> None:
    result = forecast(main=Stat.HP, subs=FOUR, level=0, wanted={Stat.SPD})
    assert result.upgrades == 5
    assert list(result.chances) == near(binomial(5, 1 / 4))
    assert result.expected == pytest.approx(5 / 4)


def test_two_wanted_substats_double_the_chance() -> None:
    result = forecast(main=Stat.HP, subs=FOUR, level=0, wanted={Stat.SPD, Stat.CRIT_RATE})
    assert list(result.chances) == near(binomial(5, 1 / 2))


@pytest.mark.parametrize(
    ("level", "upgrades"),
    [(0, 5), (2, 5), (3, 4), (11, 2), (12, 1), (14, 1), (15, 0)],
)
def test_upgrades_left_follow_the_level(level: int, upgrades: int) -> None:
    result = forecast(main=Stat.HP, subs=FOUR, level=level, wanted={Stat.SPD})
    assert result.upgrades == upgrades
    assert len(result.chances) == upgrades + 1
    assert sum(result.chances) == pytest.approx(1)


def test_three_substats_the_first_upgrade_adds_a_weighted_new_one() -> None:
    # The pool without the main stat and the three present: 100 - 10 - 10 - 10 - 4 = 66.
    result = forecast(
        main=Stat.HP, subs=(Stat.ATK, Stat.DEF, Stat.SPD), level=0, wanted={Stat.CRIT_RATE}
    )
    arrives = 6 / 66
    later = binomial(4, 1 / 4)  # once CRIT Rate is there, four upgrades may land on it
    expected = [1 - arrives, *(arrives * chance for chance in later)]
    assert result.upgrades == 5
    assert list(result.chances) == near(expected)


def test_a_wanted_stat_already_there_counts_while_the_fourth_arrives() -> None:
    result = forecast(main=Stat.HP, subs=(Stat.ATK, Stat.DEF, Stat.SPD), level=0, wanted={Stat.SPD})
    # The new substat is never SPD, so SPD only gets the four later upgrades.
    assert list(result.chances) == near([*binomial(4, 1 / 4), 0])


def test_wanting_the_main_stat_changes_nothing() -> None:
    plain = forecast(main=Stat.HP, subs=FOUR, level=0, wanted={Stat.SPD})
    assert forecast(main=Stat.HP, subs=FOUR, level=0, wanted={Stat.SPD, Stat.HP}) == plain


def test_exact_chances_agree_with_a_simulation() -> None:
    subs = (Stat.ATK, Stat.DEF, Stat.SPD)
    wanted = {Stat.SPD, Stat.CRIT_RATE, Stat.CRIT_DMG}
    result = forecast(main=Stat.HP, subs=subs, level=0, wanted=wanted)
    rng = random.Random(7)  # noqa: S311 - a repeatable simulation, not a secret
    runs = 200_000
    counts = [0] * 6
    for _ in range(runs):
        present = list(subs)
        pool = [stat for stat in SUBSTAT_WEIGHTS if stat not in present and stat != Stat.HP]
        new = rng.choices(pool, [SUBSTAT_WEIGHTS[stat] for stat in pool])[0]
        present.append(new)
        hits = int(new in wanted) + sum(rng.choice(present) in wanted for _ in range(4))
        counts[hits] += 1
    assert [count / runs for count in counts] == pytest.approx(list(result.chances), abs=0.005)


@pytest.mark.parametrize(
    ("main", "subs", "level"),
    [
        (Stat.HP, (Stat.ATK, Stat.DEF), 0),
        (Stat.HP, (Stat.ATK, Stat.ATK, Stat.DEF, Stat.SPD), 0),
        (Stat.HP, (Stat.HP, Stat.ATK, Stat.DEF, Stat.SPD), 0),
        (Stat.HP, (Stat.ATK, Stat.DEF, Stat.SPD, Stat.ENERGY_REGEN), 0),
        (Stat.HP, (Stat.ATK, Stat.DEF, Stat.SPD), 3),
    ],
    ids=["too-few", "repeated", "same-as-main", "never-a-substat", "three-after-first-upgrade"],
)
def test_impossible_relics_are_refused(main: Stat, subs: tuple[Stat, ...], level: int) -> None:
    with pytest.raises(RelicError):
        forecast(main=main, subs=subs, level=level, wanted={Stat.SPD})
