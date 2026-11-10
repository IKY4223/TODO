from collections.abc import Callable, Iterator
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.showcase.api import cache, get_fetch
from app.showcase.enka import EnkaError

FIXTURE = (Path(__file__).parent / "fixtures" / "enka_showcase.json").read_bytes()
URL = "/api/showcase/700000001"

client = TestClient(app)
Respond = Callable[[], bytes]


@pytest.fixture
def enka() -> Iterator[Callable[[Respond], list[str]]]:
    """Stand in for Enka.Network: returns the list of UIDs it was asked for."""

    def install(respond: Respond) -> list[str]:
        requested: list[str] = []

        def fetch(uid: str) -> bytes:
            requested.append(uid)
            return respond()

        app.dependency_overrides[get_fetch] = lambda: fetch
        return requested

    cache.clear()
    yield install
    app.dependency_overrides.clear()
    cache.clear()


def fail_with(status: int | None) -> Respond:
    def respond() -> bytes:
        raise EnkaError(status)

    return respond


def test_returns_the_showcase(enka: Callable[[Respond], list[str]]) -> None:
    requested = enka(lambda: FIXTURE)
    response = client.get(URL)
    assert response.status_code == 200
    body = response.json()
    assert requested == ["700000001"]
    assert (body["uid"], body["nickname"]) == ("700000001", "Traveler")
    amber = body["characters"][0]
    assert (amber["name"], amber["element"], amber["talents"]) == ("Amber", "pyro", [10, 13, 13])
    assert amber["stats"][0] == {"key": "hp", "value": pytest.approx(14241.1758)}
    assert amber["artifacts"][0]["slot"] == "flower"


def test_repeat_request_does_not_ask_enka_again(enka: Callable[[Respond], list[str]]) -> None:
    requested = enka(lambda: FIXTURE)
    assert client.get(URL).json() == client.get(URL).json()
    assert len(requested) == 1


@pytest.mark.parametrize(
    "uid", ["12345678", "12345678901", "abcdefghi", "1234 5678", "123456789%0A"]
)
def test_malformed_uid_never_reaches_enka(enka: Callable[[Respond], list[str]], uid: str) -> None:
    requested = enka(lambda: FIXTURE)
    assert client.get(f"/api/showcase/{uid}").status_code == 422
    assert requested == []


@pytest.mark.parametrize(
    ("enka_status", "status"),
    [(400, 400), (404, 404), (424, 503), (429, 503), (500, 502), (503, 502), (None, 502)],
)
def test_enka_failure_becomes_a_readable_error(
    enka: Callable[[Respond], list[str]], enka_status: int | None, status: int
) -> None:
    enka(fail_with(enka_status))
    response = client.get(URL)
    assert response.status_code == status
    assert isinstance(response.json()["detail"], str)


def test_failure_is_not_cached(enka: Callable[[Respond], list[str]]) -> None:
    enka(fail_with(429))
    assert client.get(URL).status_code == 503
    enka(lambda: FIXTURE)
    assert client.get(URL).status_code == 200


def test_unreadable_enka_data_is_a_bad_gateway(enka: Callable[[Respond], list[str]]) -> None:
    enka(lambda: b"<html>maintenance</html>")
    response = client.get(URL)
    assert response.status_code == 502
    assert isinstance(response.json()["detail"], str)


@pytest.mark.parametrize(
    "respond",
    [fail_with(500), lambda: b"<html>maintenance</html>"],
    ids=["enka-down", "unreadable-data"],
)
def test_upstream_failure_is_logged(
    enka: Callable[[Respond], list[str]], caplog: pytest.LogCaptureFixture, respond: Respond
) -> None:
    enka(respond)
    client.get(URL)
    assert [record.levelname for record in caplog.records if record.name == "app.showcase.api"] == [
        "WARNING"
    ]
