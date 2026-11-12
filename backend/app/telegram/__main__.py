"""Run the bot: `uv run python -m app.telegram`, with the token in TELEGRAM_BOT_TOKEN."""

import logging
import os
import sys
import time
from functools import partial

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
RETRY_SECONDS = 5  # after a failed poll, so a Telegram outage is not hammered


def load(uid: str) -> dict[Language, StarRailShowcase]:
    return showcase_api.serve(uid, lambda: fetch(uid, url=enka.ENKA_URL), enka.parse_all, cache)


def main() -> None:  # pragma: no cover - the loop runs until the process is stopped
    logging.basicConfig(
        level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s"
    )
    token = os.environ.get("TELEGRAM_BOT_TOKEN", "")
    if not token:
        logger.error("Set TELEGRAM_BOT_TOKEN to the token @BotFather gave the bot.")
        sys.exit(1)
    call = partial(client.call, token, timeout=POLL_SECONDS + 10)
    chats = Chats()
    logger.info("The bot is running.")
    while True:
        if not poll_once(call, load, limiter, chats):
            time.sleep(RETRY_SECONDS)


if __name__ == "__main__":  # pragma: no cover
    main()
