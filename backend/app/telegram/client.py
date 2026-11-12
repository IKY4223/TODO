"""The two Telegram Bot API calls the bot makes, over the standard library."""

import json
from http.client import HTTPException
from typing import Any
from urllib.error import HTTPError
from urllib.request import Request, urlopen

API = "https://api.telegram.org/bot{token}/{method}"
MAX_RESPONSE_BYTES = 1_000_000


class TelegramError(Exception):
    """A failed call. Holds only the status: the request URL carries the bot's token."""

    def __init__(self, status: int | None) -> None:
        super().__init__(status)
        self.status = status


def call(token: str, method: str, payload: dict[str, Any], timeout: float = 60) -> Any:
    """The result of one Bot API method. `method` is one of this package's constant names."""
    request = Request(  # noqa: S310 - a constant https address
        API.format(token=token, method=method),
        data=json.dumps(payload).encode(),
        headers={"Content-Type": "application/json"},
    )
    # `from None` everywhere: a chained error would carry the URL, and the token with it, into logs.
    try:
        with urlopen(request, timeout=timeout) as response:  # noqa: S310
            body = json.loads(response.read(MAX_RESPONSE_BYTES))
    except HTTPError as error:
        raise TelegramError(error.code) from None
    except (OSError, ValueError, HTTPException):  # no connection, timeout, bad URL or not JSON
        raise TelegramError(None) from None
    if not isinstance(body, dict) or not body.get("ok"):
        status = body.get("error_code") if isinstance(body, dict) else None
        raise TelegramError(status if isinstance(status, int) else None)
    return body.get("result")
