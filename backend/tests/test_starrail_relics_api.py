from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)
URL = "/api/starrail/relics/forecast"
SUBS = [
    {"key": "atk"},
    {"key": "def"},
    {"key": "spd", "value": 2.6},
    {"key": "crit_rate", "value": 3.2},
]
RELIC = {"main": "hp", "subs": SUBS, "level": 12, "wanted": ["spd"]}


def test_forecast() -> None:
    response = client.post(URL, json=RELIC)
    assert response.status_code == 200
    assert response.json() == {
        "upgrades": 1,
        "chances": [0.75, 0.25],
        "expected": 0.25,
        "score": 1.0,
        "beats": None,
        "reaches": None,
    }


def test_compares_and_checks_a_goal_in_the_units_the_game_shows() -> None:
    # CRIT Rate 3.2 is 3.2%: one more roll of any size reaches 5.7%.
    goal = {"key": "crit_rate", "value": 5.7}
    body = client.post(URL, json={**RELIC, "beat": 1.5, "goal": goal}).json()
    assert (body["beats"], body["reaches"]) == (0.25, 0.25)


def test_impossible_relic_is_explained() -> None:
    twice = [{"key": "atk"}, {"key": "atk"}, {"key": "def"}, {"key": "spd"}]
    response = client.post(URL, json={**RELIC, "subs": twice})
    assert response.status_code == 422
    assert response.json() == {"detail": "A relic cannot have the same substat twice."}


def test_invalid_input_is_refused() -> None:
    changes: list[dict[str, object]] = [
        {"level": 16},
        {"level": -1},
        {"main": "luck"},
        {"subs": []},
        {"beat": -1},
        {"goal": {"key": "spd", "value": -2}},
        {"subs": [{"key": "atk", "value": -1}]},
    ]
    for change in changes:
        assert client.post(URL, json={**RELIC, **change}).status_code == 422


def test_requests_are_limited() -> None:
    statuses = [client.post(URL, json=RELIC).status_code for _ in range(61)]
    assert statuses[-1] == 429
    assert set(statuses[:-1]) == {200}
