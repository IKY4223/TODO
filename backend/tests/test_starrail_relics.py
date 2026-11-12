import random
from math import comb

import pytest

from app.starrail.models import StarRailStatKey as Stat
from app.starrail.relics import ROLLS, SUBSTAT_WEIGHTS, RelicError, forecast

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
    ("subs", "level", "rarity"),
    [
        ((Stat.ATK, Stat.DEF), 0, 5),
        ((Stat.ATK, Stat.ATK, Stat.DEF, Stat.SPD), 0, 5),
        ((Stat.HP, Stat.ATK, Stat.DEF, Stat.SPD), 0, 5),
        ((Stat.ATK, Stat.DEF, Stat.SPD, Stat.ENERGY_REGEN), 0, 5),
        ((Stat.ATK, Stat.DEF, Stat.SPD), 3, 5),
        ((Stat.ATK,), 0, 4),
        ((Stat.ATK, Stat.DEF), 3, 4),
        (FOUR, 13, 4),
    ],
    ids=[
        "too-few",
        "repeated",
        "same-as-main",
        "never-a-substat",
        "three-after-first-upgrade",
        "too-few-for-4-star",
        "two-after-first-upgrade",
        "above-4-star-cap",
    ],
)
def test_impossible_relics_are_refused(subs: tuple[Stat, ...], level: int, rarity: int) -> None:
    with pytest.raises(RelicError):
        forecast(main=Stat.HP, subs=subs, level=level, wanted={Stat.SPD}, rarity=rarity)


def test_four_star_relic_stops_at_12_and_fills_two_slots() -> None:
    full = forecast(Stat.HP, FOUR, 0, {Stat.SPD}, rarity=4)
    assert full.upgrades == 4
    assert list(full.chances) == near(binomial(4, 1 / 4))
    # Two substats: the first two upgrades each add one. Neither present one is wanted, so
    # SPD must arrive before it can be raised: weight 4 of the 70 left without HP, ATK and DEF,
    # or 4 of what remains after another stat arrived first.
    two = forecast(Stat.HP, (Stat.ATK, Stat.DEF), 0, {Stat.SPD}, rarity=4)
    assert two.upgrades == 4
    others = {
        stat: weight
        for stat, weight in SUBSTAT_WEIGHTS.items()
        if stat not in {Stat.HP, Stat.ATK, Stat.DEF, Stat.SPD}
    }
    first = 4 / 70
    second = sum(weight / 70 * 4 / (70 - weight) for weight in others.values())
    assert sum(two.chances) == pytest.approx(1)
    assert 1 - two.chances[0] == pytest.approx(first + second)


def test_four_star_rolls_are_smaller_but_scored_on_the_same_scale() -> None:
    one = forecast(Stat.HP, FOUR, 9, set(), values={Stat.SPD: 1.6}, rarity=4, goal=(Stat.SPD, 3.2))
    assert one.reaches == pytest.approx(1 / 4)  # any 4★ SPD roll (1.6 to 2.0) reaches 3.2
    assert forecast(Stat.HP, FOUR, 12, {Stat.SPD}, values={Stat.SPD: 2.6}, rarity=4).score == (
        pytest.approx(1.0)
    )


def test_rolls_come_from_the_game_tables() -> None:
    assert ROLLS[Stat.SPD] == pytest.approx((2.0, 2.3, 2.6))
    assert ROLLS[Stat.CRIT_RATE] == pytest.approx((0.02592, 0.02916, 0.0324))
    assert set(ROLLS) == set(SUBSTAT_WEIGHTS)


def test_score_counts_wanted_substats_in_high_rolls() -> None:
    values = {Stat.SPD: 5.2, Stat.CRIT_RATE: 0.0324, Stat.ATK: 19.0}
    result = forecast(Stat.HP, FOUR, 15, {Stat.SPD, Stat.CRIT_RATE}, values=values)
    assert result.score == pytest.approx(3.0)  # two high SPD rolls and one high CRIT Rate roll
    assert (result.beats, result.reaches) == (None, None)


def test_score_needs_the_wanted_values() -> None:
    assert forecast(Stat.HP, FOUR, 15, {Stat.SPD}).score is None
    with pytest.raises(RelicError, match="value of every substat"):
        forecast(Stat.HP, FOUR, 15, {Stat.SPD}, beat=2.0)


def test_chance_to_beat_the_equipped_relic() -> None:
    values = {Stat.SPD: 2.6}  # a score of 1.0 now, one upgrade left
    # Only a high SPD roll (1/4 x 1/3) lifts the score to 2.0; the others stop below.
    assert forecast(Stat.HP, FOUR, 12, {Stat.SPD}, values=values, beat=1.95).beats == pytest.approx(
        1 / 12
    )
    assert forecast(Stat.HP, FOUR, 12, {Stat.SPD}, values=values, beat=1.5).beats == pytest.approx(
        1 / 4
    )
    assert forecast(Stat.HP, FOUR, 12, {Stat.SPD}, values=values, beat=0.5).beats == pytest.approx(
        1
    )
    # A tie is not a win.
    assert forecast(Stat.HP, FOUR, 15, {Stat.SPD}, values=values, beat=1.0).beats == pytest.approx(
        0
    )


def test_chance_to_reach_a_stat_goal() -> None:
    values = {Stat.SPD: 2.0}
    # One upgrade: SPD is picked 1/4 of the time and then adds 2.0, 2.3 or 2.6.
    assert forecast(
        Stat.HP, FOUR, 12, set(), values=values, goal=(Stat.SPD, 4.0)
    ).reaches == pytest.approx(1 / 4)
    assert forecast(
        Stat.HP, FOUR, 12, set(), values=values, goal=(Stat.SPD, 4.3)
    ).reaches == pytest.approx(1 / 6)
    assert forecast(
        Stat.HP, FOUR, 12, set(), values=values, goal=(Stat.SPD, 4.7)
    ).reaches == pytest.approx(0)
    assert forecast(
        Stat.HP, FOUR, 12, set(), values=values, goal=(Stat.SPD, 2.0)
    ).reaches == pytest.approx(1)


def test_goal_for_a_stat_that_may_still_arrive() -> None:
    result = forecast(Stat.HP, (Stat.ATK, Stat.DEF, Stat.CRIT_RATE), 0, set(), goal=(Stat.SPD, 2.0))
    assert result.reaches == pytest.approx(4 / 64)  # SPD's weight among the stats left


def test_goal_agrees_with_a_simulation() -> None:
    subs = [Stat.ATK, Stat.DEF, Stat.SPD, Stat.CRIT_RATE]
    result = forecast(Stat.HP, subs, 0, set(), values={Stat.SPD: 2.3}, goal=(Stat.SPD, 7.0))
    rng = random.Random(11)  # noqa: S311 - a repeatable simulation, not a secret
    runs = 200_000
    reached = 0
    for _ in range(runs):
        speed = 2.3 + sum(
            rng.choice(ROLLS[Stat.SPD]) for _ in range(5) if rng.choice(subs) == Stat.SPD
        )
        reached += speed >= 7.0 - 1e-9
    assert reached / runs == pytest.approx(result.reaches, abs=0.005)


@pytest.mark.parametrize(
    ("goal", "values"),
    [((Stat.HP, 100.0), {}), ((Stat.ENERGY_REGEN, 0.1), {}), ((Stat.SPD, 5.0), {})],
    ids=["main-stat", "never-a-substat", "no-current-value"],
)
def test_impossible_goals_are_refused(goal: tuple[Stat, float], values: dict[Stat, float]) -> None:
    with pytest.raises(RelicError):
        forecast(Stat.HP, FOUR, 0, set(), values=values, goal=goal)
