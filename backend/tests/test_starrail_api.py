from collections.abc import Callable, Iterator
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.showcase import api as showcase_api
from app.showcase import enka as enka_client
from app.showcase.enka import EnkaError
from app.starrail import api

FIXTURE = (Path(__file__).parent / "fixtures" / "enka_starrail.json").read_bytes()
URL = "/api/starrail/showcase/700000001"
client = TestClient(app)
Respond = Callable[[], bytes]


@pytest.fixture
def enka() -> Iterator[Callable[[Respond], list[str]]]:
    def install(respond: Respond) -> list[str]:
        requested: list[str] = []

        def fetch(uid: str) -> bytes:
            requested.append(uid)
            return respond()

        app.dependency_overrides[api.get_fetch] = lambda: fetch
        return requested

    api.cache.clear()
    yield install
    app.dependency_overrides.clear()
    api.cache.clear()


def test_returns_the_showcase(enka: Callable[[Respond], list[str]]) -> None:
    requested = enka(lambda: FIXTURE)
    body = client.get(URL).json()
    assert requested == ["700000001"]
    hyacine = body["characters"][0]
    assert (hyacine["name"], hyacine["element"], hyacine["path"]) == (
        "Hyacine",
        "wind",
        "remembrance",
    )
    assert hyacine["relics"][0]["subs"][1] == {
        "key": "spd",
        "value": pytest.approx(12.1),
        "rolls": 5,
    }


def test_repeat_request_does_not_ask_enka_again(enka: Callable[[Respond], list[str]]) -> None:
    requested = enka(lambda: FIXTURE)
    client.get(URL)
    client.get(URL)
    assert len(requested) == 1


@pytest.mark.parametrize("uid", ["12345678", "abcdefghi"])
def test_malformed_uid_never_reaches_enka(enka: Callable[[Respond], list[str]], uid: str) -> None:
    requested = enka(lambda: FIXTURE)
    assert client.get(f"/api/starrail/showcase/{uid}").status_code == 422
    assert requested == []


def test_enka_failure_becomes_a_readable_error(enka: Callable[[Respond], list[str]]) -> None:
    def missing() -> bytes:
        raise EnkaError(404)

    enka(missing)
    response = client.get(URL)
    assert response.status_code == 404
    assert response.json()["detail"] == "Player not found. Check the UID."


def test_both_games_share_one_enka_allowance(enka: Callable[[Respond], list[str]]) -> None:
    enka(lambda: FIXTURE)
    for _ in range(showcase_api.limiter.limit):
        client.get("/api/showcase/12345")  # malformed, so Enka is never asked
    assert client.get(URL).status_code == 429


def test_fetch_asks_enka_for_the_star_rail_showcase(monkeypatch: pytest.MonkeyPatch) -> None:
    seen: list[str] = []

    class Reply:
        def __enter__(self) -> "Reply":
            return self

        def __exit__(self, *args: object) -> None:
            return None

        def read(self, amount: int) -> bytes:
            return b"{}"[:amount]

    def urlopen(request: object, timeout: float) -> Reply:
        seen.append(getattr(request, "full_url", ""))
        return Reply()

    monkeypatch.setattr(enka_client, "urlopen", urlopen)
    api.get_fetch()("700000001")
    assert seen == ["https://enka.network/api/hsr/uid/700000001"]
