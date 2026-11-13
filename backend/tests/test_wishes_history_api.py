from collections.abc import Callable, Iterator

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.wishes import api
from app.wishes.history import HistoryError
from tests.gacha_fixture import ANDROID_TEXT, AUTHKEY, UID, body

URL = "/api/wishes/history"
client = TestClient(app)
Fetch = Callable[[str], bytes]


@pytest.fixture
def hoyoverse() -> Iterator[Callable[[Fetch], list[str]]]:
    """Stand in for HoYoverse: returns the list of URLs it was asked for."""

    def install(respond: Fetch) -> list[str]:
        requested: list[str] = []

        def fetch(url: str) -> bytes:
            requested.append(url)
            return respond(url)

        app.dependency_overrides[api.get_history_fetch] = lambda: fetch
        return requested

    yield install
    app.dependency_overrides.clear()


def serve_fixture(url: str) -> bytes:
    params = dict(part.split("=", 1) for part in url.split("?", 1)[1].split("&"))
    return body(params["gacha_type"], params["end_id"])


def test_returns_one_page_of_pulls(hoyoverse: Callable[[Fetch], list[str]]) -> None:
    requested = hoyoverse(serve_fixture)
    response = client.post(URL, json={"link": ANDROID_TEXT, "banner": "301", "end_id": "0"})
    assert response.status_code == 200
    data = response.json()
    assert data["uid"] == UID
    assert len(data["pulls"]) == 20
    assert data["pulls"][0] == {
        "id": "1700000000000000025",
        "banner": "301",
        "time": "2026-10-01 12:00:25",
        "name": "Xiangling",
        "kind": "Character",
        "rank": 4,
        "item_id": "",
        "gacha_id": "",
    }
    assert len(requested) == 1


def test_continues_after_the_given_pull(hoyoverse: Callable[[Fetch], list[str]]) -> None:
    hoyoverse(serve_fixture)
    data = client.post(
        URL, json={"link": ANDROID_TEXT, "banner": "301", "end_id": "1700000000000000006"}
    ).json()
    assert [pull["id"][-2:] for pull in data["pulls"]] == ["05", "04", "03", "02", "01"]


@pytest.mark.parametrize(
    "override",
    [
        {"banner": "999"},
        {"banner": "400"},  # its pulls come with banner 301
        {"end_id": "abc"},
        {"end_id": "1" * 21},
        {"link": "x" * 5001},
    ],
    ids=["unknown-banner", "second-character-banner", "end-id-text", "end-id-long", "link-long"],
)
def test_rejects_malformed_requests(
    hoyoverse: Callable[[Fetch], list[str]], override: dict[str, str]
) -> None:
    requested = hoyoverse(serve_fixture)
    request = {"link": ANDROID_TEXT, "banner": "301", "end_id": "0", **override}
    assert client.post(URL, json=request).status_code == 422
    assert requested == []


def test_text_without_a_link_is_explained(hoyoverse: Callable[[Fetch], list[str]]) -> None:
    requested = hoyoverse(serve_fixture)
    response = client.post(URL, json={"link": "hello", "banner": "301", "end_id": "0"})
    assert response.status_code == 400
    assert "link" in response.json()["detail"]
    assert requested == []


def test_hoyoverse_refusal_is_passed_on(hoyoverse: Callable[[Fetch], list[str]]) -> None:
    def expired(url: str) -> bytes:
        return b'{"data":null,"message":"authkey timeout","retcode":-101}'

    hoyoverse(expired)
    response = client.post(URL, json={"link": ANDROID_TEXT, "banner": "301", "end_id": "0"})
    assert response.status_code == 410
    assert "expired" in response.json()["detail"]


def test_throttling_asks_the_client_to_wait(hoyoverse: Callable[[Fetch], list[str]]) -> None:
    def throttled(url: str) -> bytes:
        return b'{"data":null,"message":"visit too frequently","retcode":-110}'

    hoyoverse(throttled)
    response = client.post(URL, json={"link": ANDROID_TEXT, "banner": "301", "end_id": "0"})
    assert response.status_code == 429
    assert int(response.headers["Retry-After"]) >= 1


def test_the_key_never_reaches_the_logs(
    hoyoverse: Callable[[Fetch], list[str]], caplog: pytest.LogCaptureFixture
) -> None:
    def broken(url: str) -> bytes:
        raise HistoryError(502, "HoYoverse is not responding.")

    hoyoverse(broken)
    caplog.set_level("DEBUG")
    client.post(URL, json={"link": ANDROID_TEXT, "banner": "301", "end_id": "0"})
    hoyoverse(lambda _url: b"not json")
    client.post(URL, json={"link": ANDROID_TEXT, "banner": "301", "end_id": "0"})
    assert caplog.records  # failures are logged...
    logged = "\n".join(record.getMessage() + str(record.exc_info) for record in caplog.records)
    assert AUTHKEY not in logged  # ...without the key
    assert "a%2Bb" not in logged
