"""Run the bot: `uv run python -m app.telegram`, with the token in TELEGRAM_BOT_TOKEN."""

import logging
import os
import re
import sys
import time
from functools import partial
from pathlib import Path

from fastapi import HTTPException

from app.ratelimit import RateLimiter
from app.showcase import api as showcase_api
from app.showcase.enka import fetch
from app.starrail import enka
from app.starrail.api import cache
from app.starrail.models import Language, StarRailShowcase
from app.telegram import client
from app.telegram.bot import POLL_SECONDS, Chats, poll_once

logger = logging.getLogger("app.telegram")

# Each chat may ask this often; Enka.Network's answers are cached as for the site.
limiter = RateLimiter(limit=10, window=60)
# And all chats together look this many players up on Enka.Network.
lookups = RateLimiter(limit=30, window=60)
ALL_CHATS = "all"
# What @BotFather hands out. Anything else, a stray space or line break, would end up in the URL.
TOKEN = re.compile(r"\d+:[\w-]+")
BUSY = "The bot is looking up many players right now: try in a minute."
RETRY_SECONDS = 5  # after a failed poll, so a Telegram outage is not hammered


def valid_token(token: str) -> bool:
    return TOKEN.fullmatch(token) is not None


def download(uid: str) -> bytes:
    if lookups.seconds_until_allowed(ALL_CHATS):
        raise HTTPException(429, BUSY)
    return fetch(uid, url=enka.ENKA_URL)


def load(uid: str) -> dict[Language, StarRailShowcase]:
    # A cached showcase costs no lookup: the limit counts only real requests to Enka.Network.
    return showcase_api.serve(uid, lambda: download(uid), enka.parse_all, cache)


def main() -> None:  # pragma: no cover - the loop runs until the process is stopped
    logging.basicConfig(
        level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s"
    )
    token = os.environ.get("TELEGRAM_BOT_TOKEN", "")
    if not valid_token(token):
        logger.error("Set TELEGRAM_BOT_TOKEN to the token @BotFather gave the bot, nothing else.")
        sys.exit(1)
    call = partial(client.call, token, timeout=POLL_SECONDS + 10)
    # Where the bot keeps its place and the languages chats chose; without it, in memory only.
    state = os.environ.get("TELEGRAM_STATE_FILE")
    chats = Chats.load(Path(state)) if state else Chats()
    logger.info("The bot is running.")
    while True:
        if not poll_once(call, load, limiter, chats):
            time.sleep(RETRY_SECONDS)


if __name__ == "__main__":  # pragma: no cover
    main()
