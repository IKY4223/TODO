from fastapi.testclient import TestClient

from app.main import app
from app.starrail.gamedata import GAMEDATA, TEXTS

client = TestClient(app)
URL = "/api/starrail/characters/1409"


def test_skills_and_eidolons_are_described() -> None:
    body = client.get(URL).json()
    basic = body["skills"][0]
    assert (basic["kind"], basic["label"], basic["name"]) == (
        "basic",
        "Basic ATK",
        "When Breeze Kisses Cirrus",
    )
    assert basic["description"].startswith("Deals Wind DMG equal to #1[i]% of Hyacine's Max HP")
    assert basic["params"][4] == [0.45]  # level 5
    assert [skill["kind"] for skill in body["skills"]].count(None) == 1  # the technique
    assert len(body["eidolons"]) == 6
    assert body["eidolons"][0]["name"] == "Cradle the Candle of Night"


def test_traces_come_with_their_costs() -> None:
    body = client.get(URL).json()
    traces = {trace["id"]: trace for trace in body["traces"]}
    basic, ability, stat = traces[1409001], traces[1409101], traces[1409203]
    assert (basic["name"], basic["skill"]) == ("When Breeze Kisses Cirrus", True)
    assert len(basic["costs"]) == 6  # one per level
    assert basic["costs"][0] == {}  # level 1 is free
    assert (ability["name"], ability["skill"]) == ("Gloomy Grin", False)
    assert ability["params"] == [1, 0.5, 0.25]
    assert (stat["name"], stat["description"]) == ("SPD Boost", "+2")
    assert traces[1409202]["description"] == "+4%"
    assert stat["costs"] == [{"2": 9000, "110252": 3, "115002": 2}]
    assert body["items"]["2"] == "Credit"
    used = {item for trace in body["traces"] for level in trace["costs"] for item in level}
    assert set(body["items"]) == used


def test_texts_in_russian() -> None:
    body = client.get(URL, params={"lang": "ru"}).json()
    assert body["skills"][0]["label"] == "Базовая атака"
    assert body["eidolons"][0]["name"] == "Пламя ночной свечи"


def test_unknown_character_and_bad_input() -> None:
    response = client.get("/api/starrail/characters/1")
    assert (response.status_code, response.json()) == (
        404,
        {"detail": "This app has no texts for this character yet."},
    )
    assert client.get("/api/starrail/characters/abc").status_code == 422
    assert client.get(URL, params={"lang": "xx"}).status_code == 422


def test_every_character_with_game_data_has_texts() -> None:
    """The texts come from another source than the game data: the two must line up."""
    for language, characters in TEXTS.languages.items():
        assert set(GAMEDATA.characters) <= set(characters), language
