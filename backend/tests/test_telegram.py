from pathlib import Path
from typing import Any
from urllib.error import HTTPError

import pytest
from fastapi import HTTPException

from app.ratelimit import RateLimiter
from app.starrail import enka
from app.starrail.api import cache as starrail_cache
from app.starrail.models import Language, StarRailShowcase
from app.telegram import bot, client
from app.telegram.bot import Chats, answer, poll_once
from app.telegram.client import TelegramError

FIXTURE = (Path(__file__).parent / "fixtures" / "enka_starrail.json").read_bytes()
UID = "700000001"
TOKEN = "123456:SECRET-token"  # noqa: S105 - a fake token, checked to never leak


def load(uid: str) -> dict[Language, StarRailShowcase]:
    assert uid == UID
    return enka.parse_all(uid, FIXTURE)[0]


def refuse(uid: str) -> dict[Language, StarRailShowcase]:
    raise HTTPException(404, f"No player with UID {uid}.")


def test_help_comes_on_start_and_on_anything_unknown() -> None:
    assert "UID" in answer("/start", "en", load).text
    assert answer("hello", "en", load).text == answer("/help", "en", load).text
    assert "UID" in answer("/start", "ru", load).text
    assert answer("/start", "ru", load).text != answer("/start", "en", load).text


def test_a_uid_lists_the_showcase_characters() -> None:
    reply = answer(UID, "en", load).text
    lines = reply.splitlines()
    assert lines[0].startswith("Trailblaze Level")
    assert any(line.startswith("Hyacine · Lv. 80 · E0 · SPD 183.5") for line in lines)
    assert "Гиацина" in answer(UID, "ru", load).text


def test_a_failed_showcase_says_why() -> None:
    assert answer(UID, "en", refuse).text == f"No player with UID {UID}."


def test_warp_odds_follow_the_banner() -> None:
    assert answer("/warp 90", "en", load).text.startswith("Chance of the featured 5★ within 90")
    # A guarantee and a pity of 89 make the next pull the featured 5★.
    assert "100.0%" in answer("/warp 1 89 g", "en", load).text
    assert "100,0" in answer("/warp 1 89 g", "ru", load).text
    for wrong in ("/warp", "/warp lots", "/warp 10 90", "/warp -1", "/warp 99999"):
        assert answer(wrong, "en", load).text.startswith("Write /warp"), wrong


def test_lang_switches_the_language() -> None:
    reply = answer("/lang ru", "en", load)
    assert reply.language == "ru"
    assert answer("/lang de", "en", load).language == "en"


class FakeTelegram:
    def __init__(self, updates: list[dict[str, Any]]) -> None:
        self.updates = updates
        self.sent: list[dict[str, Any]] = []
        self.offsets: list[int] = []

    def __call__(self, method: str, payload: dict[str, Any]) -> Any:
        if method == "getUpdates":
            self.offsets.append(payload["offset"])
            updates, self.updates = self.updates, []
            return updates
        assert method == "sendMessage"
        self.sent.append(payload)
        return {}


def message(update_id: int, text: Any, chat: int = 7, language: str = "en") -> dict[str, Any]:
    return {
        "update_id": update_id,
        "message": {"chat": {"id": chat}, "from": {"language_code": language}, "text": text},
    }


def test_a_poll_answers_each_message_and_moves_past_it() -> None:
    telegram = FakeTelegram([message(1, "/start"), message(2, UID, language="ru")])
    chats = Chats()
    poll_once(telegram, load, RateLimiter(limit=10, window=60), chats)
    assert [sent["chat_id"] for sent in telegram.sent] == [7, 7]
    assert "Гиацина" in telegram.sent[1]["text"]  # the chat's language from its Telegram user
    poll_once(telegram, load, RateLimiter(limit=10, window=60), chats)
    assert telegram.offsets == [0, 3]


def test_odd_updates_are_skipped() -> None:
    odd: list[dict[str, Any]] = [
        {"update_id": 1},
        {"update_id": 2, "message": {"chat": {"id": 7}}},
        message(3, ["not", "text"]),
        message(4, "x" * (bot.MAX_TEXT + 1)),
    ]
    telegram = FakeTelegram(odd)
    poll_once(telegram, load, RateLimiter(limit=10, window=60), Chats())
    assert telegram.sent == []


def test_a_chat_that_asks_too_often_waits() -> None:
    telegram = FakeTelegram([message(1, "/start"), message(2, "/start")])
    poll_once(telegram, load, RateLimiter(limit=1, window=60, clock=lambda: 0.0), Chats())
    assert telegram.sent[1]["text"] == "Too many requests: try again in 60 s."


def test_a_failed_poll_is_retried_later(caplog: pytest.LogCaptureFixture) -> None:
    def broken(method: str, payload: dict[str, Any]) -> Any:
        raise TelegramError(502)

    poll_once(broken, load, RateLimiter(limit=1, window=60), Chats())
    assert "Telegram getUpdates failed: 502" in caplog.text


def test_the_token_never_shows_in_an_error(monkeypatch: pytest.MonkeyPatch) -> None:
    def fail(request: Any, timeout: float) -> Any:
        raise HTTPError(request.full_url, 401, "Unauthorized", {}, None)  # type: ignore[arg-type]

    monkeypatch.setattr(client, "urlopen", fail)
    with pytest.raises(TelegramError) as raised:
        client.call(TOKEN, "getMe", {})
    error = raised.value
    assert error.status == 401
    assert TOKEN not in repr(error)
    assert error.__cause__ is None
    assert error.__suppress_context__


def test_an_answer_telegram_refuses_is_an_error(monkeypatch: pytest.MonkeyPatch) -> None:
    class Response:
        def __enter__(self) -> "Response":
            return self

        def __exit__(self, *_: object) -> None:
            return None

        def read(self, _: int) -> bytes:
            return b'{"ok": false, "error_code": 400}'

    monkeypatch.setattr(client, "urlopen", lambda *_, **__: Response())
    with pytest.raises(TelegramError) as raised:
        client.call(TOKEN, "sendMessage", {"chat_id": 1, "text": "hi"})
    assert raised.value.status == 400

    def offline(request: Any, timeout: float) -> Any:
        raise OSError("no network")

    monkeypatch.setattr(client, "urlopen", offline)
    with pytest.raises(TelegramError) as raised:
        client.call(TOKEN, "getMe", {})
    assert raised.value.status is None


def test_a_failed_reply_does_not_stop_the_others(caplog: pytest.LogCaptureFixture) -> None:
    sent: list[int] = []

    def blocked_by_one(method: str, payload: dict[str, Any]) -> Any:
        if method == "getUpdates":
            return ["not an update", message(1, "/start", chat=1), message(2, "/start", chat=2)]
        if payload["chat_id"] == 1:
            raise TelegramError(403)
        sent.append(payload["chat_id"])
        return {}

    assert poll_once(blocked_by_one, load, RateLimiter(limit=10, window=60), Chats())
    assert sent == [2]
    assert "Telegram sendMessage failed: 403" in caplog.text


def test_a_call_returns_the_result_and_refuses_odd_bodies(monkeypatch: pytest.MonkeyPatch) -> None:
    class Response:
        body = b""

        def __enter__(self) -> "Response":
            return self

        def __exit__(self, *_: object) -> None:
            return None

        def read(self, _: int) -> bytes:
            return self.body

    response = Response()
    monkeypatch.setattr(client, "urlopen", lambda *_, **__: response)
    response.body = b"[]"
    with pytest.raises(TelegramError) as raised:
        client.call(TOKEN, "getMe", {})
    assert raised.value.status is None
    response.body = b'{"ok": true, "result": {"username": "hoyo_bot"}}'
    assert client.call(TOKEN, "getMe", {}) == {"username": "hoyo_bot"}


def test_the_bot_loads_showcases_as_the_site_does(monkeypatch: pytest.MonkeyPatch) -> None:
    from app.telegram import __main__ as entry  # noqa: PLC0415 - the module that runs the bot

    monkeypatch.setattr(entry, "fetch", lambda *_, **__: FIXTURE)
    starrail_cache.clear()
    assert entry.load(UID)["en"].uid == UID


def test_a_message_that_breaks_the_bot_does_not_stop_it(caplog: pytest.LogCaptureFixture) -> None:
    def broken(uid: str) -> dict[Language, StarRailShowcase]:
        raise RuntimeError("unexpected")

    telegram = FakeTelegram([message(1, UID), message(2, "/start")])
    chats = Chats()
    assert poll_once(telegram, broken, RateLimiter(limit=10, window=60), chats)
    assert chats.offset == 3  # moved past the update that broke, so it is not read again
    assert len(telegram.sent) == 1
    assert "could not answer an update" in caplog.text


def test_an_odd_batch_counts_as_a_failed_poll() -> None:
    assert not poll_once(
        lambda *_: {"not": "a list"}, load, RateLimiter(limit=1, window=60), Chats()
    )


def test_a_url_telegram_cannot_take_is_an_error_without_the_token() -> None:
    with pytest.raises(TelegramError) as raised:
        client.call(TOKEN + "\r", "getMe", {})
    assert TOKEN not in repr(raised.value)
    assert raised.value.__cause__ is None


def test_the_token_must_look_like_one() -> None:
    from app.telegram import __main__ as entry  # noqa: PLC0415 - the module that runs the bot

    assert entry.valid_token(TOKEN)
    for wrong in ("", "secret", TOKEN + "\n", " " + TOKEN, "123:abc def"):
        assert not entry.valid_token(wrong), repr(wrong)


def test_the_bot_limits_its_lookups_on_enka_for_all_chats(monkeypatch: pytest.MonkeyPatch) -> None:
    from app.telegram import __main__ as entry  # noqa: PLC0415 - the module that runs the bot

    monkeypatch.setattr(entry, "fetch", lambda *_, **__: FIXTURE)
    monkeypatch.setattr(entry, "lookups", RateLimiter(limit=1, window=60, clock=lambda: 0.0))
    starrail_cache.clear()
    entry.load(UID)
    starrail_cache.clear()
    with pytest.raises(HTTPException) as raised:
        entry.load(UID)
    assert raised.value.status_code == 429


def test_failures_are_explained_in_russian_too() -> None:
    from app.showcase import api as showcase_api  # noqa: PLC0415 - the reasons the API gives
    from app.telegram import __main__ as entry  # noqa: PLC0415 - the module that runs the bot

    def failing(reason: str) -> bot.LoadShowcase:
        def fail(uid: str) -> dict[Language, StarRailShowcase]:
            raise HTTPException(502, reason)

        return fail

    reasons = [detail for _, detail in showcase_api.FAILURES.values()]
    reasons += [showcase_api.UNAVAILABLE[1], showcase_api.UNREADABLE[1], entry.BUSY]
    for reason in reasons:
        assert answer(UID, "en", failing(reason)).text == reason
        russian = answer(UID, "ru", failing(reason)).text
        assert russian != reason, reason
        assert not any("a" <= letter <= "z" for letter in russian.replace("Enka.Network", "")), (
            russian
        )
    # A reason this bot has no translation for still reaches the player.
    assert answer(UID, "ru", failing("Something new.")).text == "Something new."


def test_only_a_language_the_chat_chose_is_remembered() -> None:
    telegram = FakeTelegram([message(1, "/start", chat=7), message(2, "/lang ru", chat=8)])
    chats = Chats()
    poll_once(telegram, load, RateLimiter(limit=10, window=60), chats)
    assert chats.languages == {8: "ru"}


def test_the_bot_keeps_its_place_and_the_chosen_languages_across_restarts(
    tmp_path: Path,
) -> None:
    state = tmp_path / "bot.json"
    chats = Chats.load(state)
    assert chats == Chats(path=state)  # nothing saved yet
    telegram = FakeTelegram([message(1, "/lang ru", chat=8), message(2, "/start", chat=8)])
    poll_once(telegram, load, RateLimiter(limit=10, window=60), chats)
    restarted = Chats.load(state)
    assert (restarted.offset, restarted.languages) == (3, {8: "ru"})
    telegram = FakeTelegram([message(3, "/start", chat=8)])
    poll_once(telegram, load, RateLimiter(limit=10, window=60), restarted)
    assert telegram.offsets == [3]
    assert telegram.sent[0]["text"].startswith("Пришлите UID")


def test_an_unreadable_state_file_starts_afresh(
    tmp_path: Path, caplog: pytest.LogCaptureFixture
) -> None:
    state = tmp_path / "bot.json"
    for broken in ("not json", '{"offset": "x", "languages": {}}', '{"languages": {"8": "de"}}'):
        state.write_text(broken)
        assert Chats.load(state) == Chats(path=state), broken
    assert caplog.text.count("starts afresh") == 3


def test_without_a_state_file_the_bot_keeps_its_place_in_memory() -> None:
    telegram = FakeTelegram([message(1, "/lang ru")])
    chats = Chats()
    poll_once(telegram, load, RateLimiter(limit=10, window=60), chats)
    assert (chats.offset, chats.languages, chats.path) == (2, {7: "ru"}, None)


def test_a_state_file_that_cannot_be_written_does_not_stop_the_bot(
    tmp_path: Path, caplog: pytest.LogCaptureFixture
) -> None:
    chats = Chats(path=tmp_path / "missing" / "bot.json")
    assert poll_once(FakeTelegram([message(1, "/start")]), load, RateLimiter(10, 60), chats)
    assert chats.offset == 2
    assert "could not save its state" in caplog.text
