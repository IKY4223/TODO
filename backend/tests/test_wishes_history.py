from email.message import Message
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import parse_qs, urlsplit
from urllib.request import Request

import pytest

from app.wishes import history
from app.wishes.history import HistoryError, LinkError, history_url, parse_link, parse_page
from tests.gacha_fixture import ANDROID_TEXT, AUTHKEY, LINK_PARAMS, UID, body, pull


def query(url: str) -> dict[str, list[str]]:
    return parse_qs(urlsplit(url).query)


def test_reads_the_link_out_of_androids_error_page() -> None:
    params = parse_link(ANDROID_TEXT)
    assert params["authkey"] == AUTHKEY
    assert params["region"] == "os_euro"


@pytest.mark.parametrize(
    "link",
    [
        f"https://gs.hoyoverse.com/genshin/event/e20190909gacha-v3/index.html?{LINK_PARAMS}&authkey=a%2Bb%2Fc%3D%3D#/log",
        # Some links carry their parameters after the page fragment.
        f"https://webstatic-sea.hoyoverse.com/genshin/event/e20190909gacha-v3/index.html#/log?{LINK_PARAMS}&authkey=a%2Bb%2Fc%3D%3D",
        # What a traffic-sniffing app shows on iOS: the API request itself.
        f"https://hk4e-api-os.hoyoverse.com/gacha_info/api/getGachaLog?{LINK_PARAMS}&authkey=a%2Bb%2Fc%3D%3D&gacha_type=301",
    ],
    ids=["page", "params-after-fragment", "api-request"],
)
def test_reads_every_form_the_link_takes(link: str) -> None:
    assert parse_link(link)["authkey"] == AUTHKEY


@pytest.mark.parametrize(
    "text",
    ["", "no link here", "https://example.com/page?lang=en", "https://example.com/?authkey="],
    ids=["empty", "no-url", "no-authkey", "empty-authkey"],
)
def test_text_without_a_key_is_refused(text: str) -> None:
    with pytest.raises(LinkError):
        parse_link(text)


def test_request_always_goes_to_hoyoverse() -> None:
    url = history_url(
        parse_link(ANDROID_TEXT.replace("webstatic-sea.hoyoverse.com", "evil.example")), "301", "0"
    )
    assert urlsplit(url).netloc == "public-operation-hk4e-sg.hoyoverse.com"
    assert urlsplit(url).path == "/gacha_info/api/getGachaLog"


def test_request_keeps_the_key_intact_and_sets_its_own_paging() -> None:
    params = parse_link(ANDROID_TEXT + "&gacha_type=999&size=1&end_id=5")
    sent = query(history_url(params, "302", "1700000000000000042"))
    assert sent["authkey"] == [AUTHKEY]
    assert sent["gacha_type"] == ["302"]
    assert sent["end_id"] == ["1700000000000000042"]
    assert sent["size"] == ["20"]
    assert sent["lang"] == ["en"]


def test_page_becomes_pulls() -> None:
    page = parse_page(body("301", "0"))
    assert page.uid == UID
    pulls = page.pulls
    assert len(pulls) == 20
    newest = pulls[0]
    assert (newest.id, newest.banner, newest.name, newest.rank) == (
        "1700000000000000025",
        "301",
        "Xiangling",
        4,
    )
    assert (newest.kind, newest.time) == ("Character", "2026-10-01 12:00:25")
    assert pulls[5].banner == "400"  # the second character banner shares the first one's history


def test_a_warp_page_keeps_the_ids_and_time_zone_an_export_needs() -> None:
    page = parse_page(body("11", "0"))
    assert page.timezone == 1
    acheron = next(p for p in page.pulls if p.name == "Acheron")
    assert (acheron.item_id, acheron.gacha_id) == ("1308", "2001")
    genshin = parse_page(body("301", "0"))
    assert genshin.timezone is None
    assert (genshin.pulls[0].item_id, genshin.pulls[0].gacha_id) == ("", "")


def test_last_page_is_shorter() -> None:
    assert len(parse_page(body("301", "1700000000000000006")).pulls) == 5
    empty = parse_page(body("302", "0"))
    assert (empty.uid, empty.pulls) == (None, [])  # an empty page cannot tell whose it is


@pytest.mark.parametrize(
    ("response", "status", "words"),
    [
        (b'{"data":null,"message":"authkey error","retcode":-100}', 400, "not valid"),
        (b'{"data":null,"message":"authkey timeout","retcode":-101}', 410, "expired"),
        (b'{"data":null,"message":"visit too frequently","retcode":-110}', 429, "Too many"),
        (b'{"data":null,"message":"something new","retcode":-1}', 502, "HoYoverse"),
        (b"<html>maintenance</html>", 502, "HoYoverse"),
        (b'{"retcode":0,"message":"OK","data":{"list":[{"id":"1"}]}}', 502, "HoYoverse"),
    ],
    ids=["bad-key", "expired-key", "too-fast", "unknown-code", "not-json", "missing-fields"],
)
def test_failures_become_readable_errors(response: bytes, status: int, words: str) -> None:
    with pytest.raises(HistoryError) as raised:
        parse_page(response)
    assert raised.value.status == status
    assert words in raised.value.detail


def test_expiry_is_recognised_by_its_message_too() -> None:
    with pytest.raises(HistoryError) as raised:
        parse_page(b'{"data":null,"message":"authkey timeout","retcode":-999}')
    assert raised.value.status == 410


class Reply:
    def __init__(self, data: bytes) -> None:
        self.data = data

    def __enter__(self) -> "Reply":
        return self

    def __exit__(self, *args: object) -> None:
        return None

    def read(self, amount: int) -> bytes:
        return self.data[:amount]


def test_fetch_reads_the_page(monkeypatch: pytest.MonkeyPatch) -> None:
    seen: list[str] = []

    def urlopen(request: Request, timeout: float) -> Reply:
        seen.append(request.full_url)
        return Reply(body("301", "0"))

    monkeypatch.setattr(history, "urlopen", urlopen)
    assert len(history.fetch("https://public-operation-hk4e-sg.hoyoverse.com/x")) > 0
    assert seen == ["https://public-operation-hk4e-sg.hoyoverse.com/x"]


@pytest.mark.parametrize(
    "failure",
    [
        HTTPError("https://hoyoverse.com", 503, "Unavailable", Message(), None),
        URLError("name resolution failed"),
        TimeoutError(),
    ],
    ids=["http-error", "unreachable", "timeout"],
)
def test_fetch_failure_is_a_readable_error(
    monkeypatch: pytest.MonkeyPatch, failure: Exception
) -> None:
    def urlopen(request: Request, timeout: float) -> Reply:
        raise failure

    monkeypatch.setattr(history, "urlopen", urlopen)
    with pytest.raises(HistoryError) as raised:
        history.fetch("https://public-operation-hk4e-sg.hoyoverse.com/x")
    assert raised.value.status == 502


def test_fetch_refuses_a_response_too_large_to_be_a_page(monkeypatch: pytest.MonkeyPatch) -> None:
    def urlopen(request: Request, timeout: float) -> Reply:
        return Reply(b"x" * (history.MAX_RESPONSE_BYTES + 1))

    monkeypatch.setattr(history, "urlopen", urlopen)
    with pytest.raises(HistoryError):
        history.fetch("https://public-operation-hk4e-sg.hoyoverse.com/x")


def test_a_fixture_pull_matches_the_real_field_set() -> None:
    fields: dict[str, Any] = pull(1, "Amber", 4)
    assert set(fields) == {
        "uid",
        "gacha_type",
        "item_id",
        "count",
        "time",
        "name",
        "lang",
        "item_type",
        "rank_type",
        "id",
    }
