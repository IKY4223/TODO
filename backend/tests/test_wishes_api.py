import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)
URL = "/api/wishes/forecast"
VALID: dict[str, str | int | bool] = {"pity": 0, "guaranteed": True, "copies": 1, "pulls": 90}


def test_forecast_returns_probability_and_milestones() -> None:
    response = client.get(URL, params=VALID)
    assert response.status_code == 200
    body = response.json()
    assert body["probability"] == 1.0
    assert body["guaranteed_at"] == 90
    assert [milestone["chance"] for milestone in body["milestones"]] == [0.5, 0.9, 0.99]
    assert body["milestones"][0]["pulls"] == 76


def test_forecast_uses_every_parameter() -> None:
    params = {"pity": 10, "guaranteed": False, "copies": 2, "pulls": 100}
    body = client.get(URL, params=params).json()
    assert body["guaranteed_at"] == 350
    assert 0 < body["probability"] < 1


def test_star_rail_banners() -> None:
    character = client.get(URL, params={**VALID, "banner": "starrail_character"}).json()
    assert character == client.get(URL, params=VALID).json()  # the same rules as Genshin's
    cone = {**VALID, "banner": "starrail_light_cone", "guaranteed": False, "pulls": 80}
    body = client.get(URL, params=cone).json()
    assert body["guaranteed_at"] == 160  # a lost 75/25 costs one more cycle of 80
    assert 0.75 < body["probability"] < 1


@pytest.mark.parametrize(
    "override",
    [
        {"banner": "starrail_light_cone", "pity": 80},
        {"banner": "starrail_light_cone", "copies": 6},
        {"banner": "standard"},
        {"pity": -1},
        {"pity": 90},
        {"copies": 0},
        {"copies": 8},
        {"pulls": -1},
        {"pulls": 2001},
        {"pity": "abc"},
    ],
)
def test_forecast_rejects_out_of_range_input(override: dict[str, int | str]) -> None:
    assert client.get(URL, params={**VALID, **override}).status_code == 422


@pytest.mark.parametrize("missing", ["pity", "guaranteed", "copies", "pulls"])
def test_forecast_requires_every_parameter(missing: str) -> None:
    params = {name: value for name, value in VALID.items() if name != missing}
    assert client.get(URL, params=params).status_code == 422
