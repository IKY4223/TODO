from collections import defaultdict

import pytest

from app.wishes.engine import (
    BANNERS,
    GENSHIN_CHARACTER,
    MILESTONE_CHANCES,
    Banner,
    Forecast,
    five_star_rate,
    forecast,
    pull_distribution,
)

BANNER = GENSHIN_CHARACTER


def brute_force(banner: Banner, pity: int, guaranteed: bool, copies: int) -> list[float]:
    """Independent oracle: walk every (pity, guaranteed, copies) state one pull at a time."""
    states = {(pity, guaranteed, 0): 1.0}
    finished_on = [0.0]
    while states:
        following: defaultdict[tuple[int, bool, int], float] = defaultdict(float)
        finished = 0.0
        for (since_last, is_guaranteed, owned), chance in states.items():
            rate = five_star_rate(banner, since_last + 1)
            featured = 1.0 if is_guaranteed else banner.featured_rate
            if rate < 1:
                following[(since_last + 1, is_guaranteed, owned)] += chance * (1 - rate)
            if owned + 1 == copies:
                finished += chance * rate * featured
            else:
                following[(0, False, owned + 1)] += chance * rate * featured
            if featured < 1:
                following[(0, True, owned)] += chance * rate * (1 - featured)
        finished_on.append(finished)
        states = dict(following)
    return finished_on


@pytest.mark.parametrize(
    ("pull", "rate"),
    [(1, 0.006), (73, 0.006), (74, 0.066), (75, 0.126), (89, 0.966), (90, 1.0)],
)
def test_five_star_rate_ramps_from_soft_pity_to_hard_pity(pull: int, rate: float) -> None:
    assert five_star_rate(BANNER, pull) == pytest.approx(rate)


def test_model_reproduces_the_official_consolidated_five_star_rate() -> None:
    # The game states 1.6% including pity; the soft pity ramp is a community estimate.
    distribution = pull_distribution(BANNER, pity=0, guaranteed=True, copies=1)
    average_pulls = sum(pulls * chance for pulls, chance in enumerate(distribution))
    assert 1 / average_pulls == pytest.approx(0.016, abs=1e-4)


@pytest.mark.parametrize(
    ("pity", "guaranteed", "copies"),
    [(0, False, 1), (0, True, 1), (40, False, 2), (75, True, 3), (89, False, 1), (89, True, 2)],
)
def test_distribution_matches_pull_by_pull_walk(pity: int, guaranteed: bool, copies: int) -> None:
    distribution = pull_distribution(BANNER, pity=pity, guaranteed=guaranteed, copies=copies)
    expected = brute_force(BANNER, pity, guaranteed, copies)
    assert len(distribution) == len(expected)
    assert distribution == pytest.approx(expected, abs=1e-12)
    assert sum(distribution) == pytest.approx(1)


@pytest.mark.parametrize(
    ("guaranteed", "probability"),
    [(True, 0.006), (False, 0.003)],
)
def test_single_pull_probability(guaranteed: bool, probability: float) -> None:
    result = forecast(BANNER, pity=0, guaranteed=guaranteed, copies=1, pulls=1)
    assert result.probability == pytest.approx(probability)


@pytest.mark.parametrize(
    ("pity", "guaranteed", "copies", "guaranteed_at"),
    [
        (0, True, 1, 90),
        (0, False, 1, 180),
        (80, True, 1, 10),
        (89, True, 1, 1),
        (10, False, 2, 350),
        (0, False, 7, 1260),
    ],
)
def test_success_is_certain_at_the_worst_case_pull_count(
    pity: int, guaranteed: bool, copies: int, guaranteed_at: int
) -> None:
    def ask(pulls: int) -> Forecast:
        return forecast(BANNER, pity=pity, guaranteed=guaranteed, copies=copies, pulls=pulls)

    assert ask(0).guaranteed_at == guaranteed_at
    assert ask(guaranteed_at).probability == 1.0
    assert ask(guaranteed_at + 500).probability == 1.0
    assert ask(guaranteed_at - 1).probability < 1.0


def test_rate_never_exceeds_certainty_on_a_steep_banner() -> None:
    steep = Banner(
        base_rate=0.5, soft_pity=2, rate_step=0.4, hard_pity=10, featured_rate=0.5, max_copies=7
    )
    assert five_star_rate(steep, 3) == 1.0
    distribution = pull_distribution(steep, pity=0, guaranteed=True, copies=1)
    assert min(distribution) >= 0
    assert sum(distribution) == pytest.approx(1)


def test_no_pulls_means_no_chance() -> None:
    assert forecast(BANNER, pity=50, guaranteed=True, copies=1, pulls=0).probability == 0.0


def test_guarantee_never_lowers_the_chance() -> None:
    with_guarantee = forecast(BANNER, pity=20, guaranteed=True, copies=2, pulls=120)
    without = forecast(BANNER, pity=20, guaranteed=False, copies=2, pulls=120)
    assert with_guarantee.probability > without.probability


def test_median_pulls_for_a_guaranteed_five_star() -> None:
    # Hand-computed: 47.4% of players have it by pull 75, 57.2% by pull 76.
    result = forecast(BANNER, pity=0, guaranteed=True, copies=1, pulls=0)
    assert result.milestones[0].chance == 0.5
    assert result.milestones[0].pulls == 76


@pytest.mark.parametrize(("pity", "guaranteed", "copies"), [(0, False, 1), (60, True, 3)])
def test_each_milestone_is_the_first_pull_count_reaching_its_chance(
    pity: int, guaranteed: bool, copies: int
) -> None:
    def chance(pulls: int) -> float:
        return forecast(
            BANNER, pity=pity, guaranteed=guaranteed, copies=copies, pulls=pulls
        ).probability

    milestones = forecast(
        BANNER, pity=pity, guaranteed=guaranteed, copies=copies, pulls=0
    ).milestones
    assert tuple(milestone.chance for milestone in milestones) == MILESTONE_CHANCES
    for milestone in milestones:
        assert chance(milestone.pulls) >= milestone.chance
        assert chance(milestone.pulls - 1) < milestone.chance


@pytest.mark.parametrize(
    ("name", "published"),
    [("genshin_character", 0.016), ("starrail_character", 0.016), ("starrail_light_cone", 0.0187)],
)
def test_soft_pity_reproduces_the_published_consolidated_rate(name: str, published: float) -> None:
    """The ramp is an estimate; the consolidated rate (one 5-star per N pulls) is published."""
    banner = BANNERS[name]
    chances = pull_distribution(banner, pity=0, guaranteed=True, copies=1)
    pulls_per_five_star = sum(pulls * chance for pulls, chance in enumerate(chances))
    assert 1 / pulls_per_five_star == pytest.approx(published, abs=0.0002)
