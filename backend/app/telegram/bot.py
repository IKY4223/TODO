"""What the bot answers, and one round of reading and answering messages.

shortcut: the state file is written after each batch, so a bot stopped between sending its
replies and writing the file answers that batch again after a restart; save per update if
that ever matters.
"""

import json
import logging
import math
import re
from collections.abc import Callable
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from fastapi import HTTPException

from app.ratelimit import RateLimiter
from app.showcase.api import UID_PATTERN
from app.starrail.models import Language, StarRailShowcase
from app.telegram.client import TelegramError
from app.wishes.api import MAX_PULLS
from app.wishes.engine import STAR_RAIL_CHARACTER, forecast

logger = logging.getLogger(__name__)

Call = Callable[[str, dict[str, Any]], Any]
LoadShowcase = Callable[[str], dict[Language, StarRailShowcase]]

POLL_SECONDS = 30  # how long Telegram holds a getUpdates call open when nothing comes
MAX_TEXT = 200  # longer messages are no command of this bot
WARP = re.compile(r"/warp(?:@\w+)?\s+(\d{1,6})(?:\s+(\d{1,3}))?(?:\s+(g))?", re.IGNORECASE)
LANG = re.compile(r"/lang(?:@\w+)?\s+(en|ru)", re.IGNORECASE)

# The replies in each language: data, so the Russian sits apart from the code.
_TEXTS = json.loads((Path(__file__).parent / "texts.json").read_text(encoding="utf-8"))
TEXTS: dict[Language, dict[str, str]] = {"en": _TEXTS["en"], "ru": _TEXTS["ru"]}
# The API gives its reasons for a failure in English; these are the same reasons in Russian.
REASONS_RU: dict[str, str] = _TEXTS["reasons_ru"]
LANGUAGES: tuple[Language, ...] = ("en", "ru")


@dataclass(frozen=True)
class Reply:
    text: str
    language: Language
    chosen: bool = False  # the chat asked for this language with /lang


def _decimal(value: float, language: Language) -> str:
    text = f"{value:.1f}"
    return text.replace(".", ",") if language == "ru" else text


def _showcase(uid: str, language: Language, load: LoadShowcase) -> str:
    texts = TEXTS[language]
    try:
        showcase = load(uid)[language]
    except HTTPException as error:
        reason = str(error.detail)
        return REASONS_RU.get(reason, reason) if language == "ru" else reason
    lines = [texts["player"].format(level=showcase.trailblaze_level, nickname=showcase.nickname)]
    for character in showcase.characters:
        spd = next((stat.value for stat in character.stats if stat.key == "spd"), 0.0)
        line = texts["character"].format(
            name=character.name,
            level=character.level,
            eidolon=character.eidolon,
            # Cut off, not rounded, as the game prints it.
            spd=_decimal(math.floor(spd * 10) / 10, language),
        )
        cone = character.light_cone
        lines.append(line + (f"\n    {cone.name} S{cone.superimposition}" if cone else ""))
    return "\n".join(lines) if showcase.characters else texts["empty"]


def _warp(match: re.Match[str], language: Language) -> str:
    texts = TEXTS[language]
    pulls, pity = int(match[1]), int(match[2] or 0)
    if pulls > MAX_PULLS or pity >= STAR_RAIL_CHARACTER.hard_pity:
        return texts["warp_usage"]
    odds = forecast(
        STAR_RAIL_CHARACTER, pity=pity, guaranteed=bool(match[3]), copies=1, pulls=pulls
    )
    chance = _decimal(odds.probability * 100, language) + "%"
    return texts["warp"].format(pulls=pulls, chance=chance, certain=odds.guaranteed_at)


def answer(text: str, language: Language, load: LoadShowcase) -> Reply:
    """The reply to one message, and the chat's language after it."""
    text = text.strip()
    if lang := LANG.fullmatch(text):
        chosen: Language = "ru" if lang[1].lower() == "ru" else "en"
        return Reply(TEXTS[chosen]["lang"], chosen, chosen=True)
    if re.fullmatch(UID_PATTERN, text):
        return Reply(_showcase(text, language, load), language)
    if warp := WARP.fullmatch(text):
        return Reply(_warp(warp, language), language)
    if text.lower().startswith("/warp"):
        return Reply(TEXTS[language]["warp_usage"], language)
    return Reply(TEXTS[language]["help"], language)


@dataclass
class Chats:
    """What the bot remembers between polls, and, given a file, between runs.

    Only chats that chose a language with /lang are kept, by their id: the others take the
    language of their Telegram app each time.
    """

    offset: int = 0  # the first update not yet answered
    languages: dict[int, Language] = field(default_factory=dict)
    path: Path | None = None

    @classmethod
    def load(cls, path: Path) -> "Chats":
        try:
            saved = json.loads(path.read_text(encoding="utf-8"))
            offset = saved["offset"]
            languages = {int(chat): language for chat, language in saved["languages"].items()}
        except FileNotFoundError:
            return cls(path=path)
        except (OSError, ValueError, KeyError, TypeError, AttributeError) as error:
            logger.warning("The bot's state file is unreadable, so it starts afresh: %s", error)
            return cls(path=path)
        if not isinstance(offset, int) or any(
            value not in LANGUAGES for value in languages.values()
        ):
            logger.warning("The bot's state file holds odd values, so it starts afresh")
            return cls(path=path)
        return cls(offset=offset, languages=languages, path=path)

    def save(self) -> None:
        """Write the state down; a disk that refuses costs a restart's memory, not the bot."""
        if self.path is None:
            return
        temporary = self.path.with_name(self.path.name + ".tmp")
        state = {"offset": self.offset, "languages": self.languages}
        try:
            # Chat ids are personal: only the bot's own user may read the file.
            temporary.touch(mode=0o600)
            temporary.chmod(0o600)  # also when an older run left the file behind
            temporary.write_text(json.dumps(state), encoding="utf-8")
            temporary.replace(self.path)  # whole or not at all, even if the bot stops midway
        except OSError as error:
            logger.warning("The bot could not save its state: %s", error.strerror)


def _handle(
    update: dict[str, Any], call: Call, load: LoadShowcase, limiter: RateLimiter, chats: Chats
) -> None:
    message = update.get("message")
    if not isinstance(message, dict):
        return
    chat = message.get("chat")
    text = message.get("text")
    if (
        not isinstance(chat, dict)
        or not isinstance(chat.get("id"), int)
        or not isinstance(text, str)
    ):
        return
    if len(text) > MAX_TEXT:
        return
    chat_id: int = chat["id"]
    sender = message.get("from")
    spoken = sender.get("language_code") if isinstance(sender, dict) else None
    language = chats.languages.get(chat_id, "ru" if spoken == "ru" else "en")
    wait = limiter.seconds_until_allowed(str(chat_id))
    if wait:
        reply = Reply(TEXTS[language]["slow"].format(seconds=math.ceil(wait)), language)
    else:
        reply = answer(text, language, load)
    if reply.chosen:
        chats.languages[chat_id] = reply.language
    try:
        call("sendMessage", {"chat_id": chat_id, "text": reply.text})
    except TelegramError as error:  # a chat that blocked the bot, say: the others still get theirs
        logger.warning("Telegram sendMessage failed: %s", error.status)


def poll_once(call: Call, load: LoadShowcase, limiter: RateLimiter, chats: Chats) -> bool:
    """Wait for new messages and answer each: False when Telegram could not be reached."""
    query = {"offset": chats.offset, "timeout": POLL_SECONDS, "allowed_updates": ["message"]}
    try:
        updates = call("getUpdates", query)
    except TelegramError as error:
        # No message text or chat id: the log keeps nothing a user sent.
        logger.warning("Telegram getUpdates failed: %s", error.status)
        return False
    if not isinstance(updates, list):
        return False
    for update in updates:
        if not isinstance(update, dict) or not isinstance(update.get("update_id"), int):
            continue
        chats.offset = update["update_id"] + 1  # answered or skipped, it is not read again
        try:
            _handle(update, call, load, limiter, chats)
        except Exception:  # one message that breaks the bot must not stop it for everyone
            logger.exception("The bot could not answer an update")
    if updates:
        chats.save()
    return True
