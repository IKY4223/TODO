from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)
URL = "/api/starrail/relics/forecast"
RELIC = {"main": "hp", "subs": ["atk", "def", "spd", "crit_rate"], "level": 12, "wanted": ["spd"]}


def test_forecast() -> None:
    response = client.post(URL, json=RELIC)
    assert response.status_code == 200
    assert response.json() == {"upgrades": 1, "chances": [0.75, 0.25], "expected": 0.25}


def test_impossible_relic_is_explained() -> None:
    response = client.post(URL, json={**RELIC, "subs": ["atk", "atk", "def", "spd"]})
    assert response.status_code == 422
    assert response.json() == {"detail": "A relic cannot have the same substat twice."}


def test_invalid_input_is_refused() -> None:
    changes: list[dict[str, object]] = [
        {"level": 16},
        {"level": -1},
        {"wanted": []},
        {"main": "luck"},
        {"subs": []},
    ]
    for change in changes:
        assert client.post(URL, json={**RELIC, **change}).status_code == 422


def test_requests_are_limited() -> None:
    statuses = [client.post(URL, json=RELIC).status_code for _ in range(61)]
    assert statuses[-1] == 429
    assert set(statuses[:-1]) == {200}
