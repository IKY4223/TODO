"""Wish and warp history from HoYoverse, read with the link the game's history page opens.

The link carries an `authkey` that lets anyone holding it read the account's wish history for
about a day. It is treated as a secret: used for the request, never stored, never logged.
HoYoverse does not document this API; the parameters and codes are those community importers
rely on: paimon.moe for Genshin, biuuu/star-rail-warp-export for Honkai: Star Rail.

shortcut: only the global servers are supported; the China servers use another host.
"""

import json
import re
from dataclasses import dataclass
from urllib.parse import parse_qsl, urlencode, urlsplit
from urllib.request import Request, urlopen

from pydantic import BaseModel, ValidationError

API_URL = "https://public-operation-hk4e-sg.hoyoverse.com/gacha_info/api/getGachaLog"
# Star Rail's own API; collaboration warps (21, 22) are read from getLdGachaLog beside it.
WARP_API = "https://public-operation-hkrpg-sg.hoyoverse.com/common/hkrpg_gacha_record/api/"
COLLABORATION_WARPS = frozenset({"21", "22"})
PAGE_SIZE = 20  # the most the API returns at once
TIMEOUT_SECONDS = 10
MAX_RESPONSE_BYTES = 200_000  # a page of 20 pulls is about 6 kB
USER_AGENT = "hoyo-toolkit"
AUTHKEY = "authkey"

# Each https address in the pasted text, up to whitespace. Matches the URL inside
# "The webpage at https://a.b/c?authkey=x#/log could not be loaded" → "https://a.b/c?authkey=x#/log";
# finds nothing in "no link here".
# https://regex101.com/?flavor=python&regex=https%3A%2F%2F%5CS%2B&testString=The%20webpage%20at%20https%3A%2F%2Fa.b%2Fc%3Fauthkey%3Dx%23%2Flog%20could%20not%20be%20loaded%0Ano%20link%20here
LINK = re.compile(r"https://\S+")

SUCCESS = 0
EXPIRED = -101
# HoYoverse's retcode -> the status and message this API answers with.
REFUSALS = {
    -100: (400, "This link is not valid. Copy it again from the game's wish history."),
    EXPIRED: (410, "This link has expired: they last about a day. Get a new one from the game."),
    -110: (429, "Too many requests to HoYoverse. Waiting a moment before trying again."),
}
EXPIRED_MESSAGE = "authkey timeout"  # also sent with other codes
UNREADABLE = (502, "HoYoverse sent an answer this app cannot read. Try again later.")
UNREACHABLE = (502, "HoYoverse is not responding. Try again later.")


class LinkError(ValueError):
    """The pasted text holds no usable wish history link."""


class HistoryError(Exception):
    """HoYoverse refused or could not be read; `detail` is safe to show and to log."""

    def __init__(self, status: int, detail: str) -> None:
        super().__init__(detail)
        self.status = status
        self.detail = detail


@dataclass(frozen=True)
class Pull:
    id: str  # increases with every pull; kept as text, it exceeds what JavaScript numbers hold
    banner: str  # the banner type the pull was made on: 301 and 400 are both character events
    time: str  # server-local time, as the game shows it
    name: str
    kind: str  # "Character" or "Weapon"
    rank: int  # 3, 4 or 5 stars
    item_id: str = ""  # the game's id of what was pulled; Genshin's history sends none
    gacha_id: str = ""  # the warp pool's id; Star Rail only


@dataclass(frozen=True)
class Page:
    uid: str | None  # the account's in-game UID; an empty page cannot tell
    timezone: int | None  # the server's UTC offset in hours, sent by Star Rail; UIGF files need it
    pulls: list[Pull]  # newest first; fewer than PAGE_SIZE means the history has no more


class _Item(BaseModel):
    uid: str
    id: str
    gacha_type: str
    time: str
    name: str
    item_type: str
    rank_type: int
    item_id: str = ""
    gacha_id: str = ""


class _Data(BaseModel):
    list: list[_Item]
    region_time_zone: int | None = None


class _Answer(BaseModel):
    retcode: int
    message: str = ""
    data: _Data | None = None


def parse_link(text: str) -> dict[str, str]:
    """The query parameters of the wish history link in `text`, which may be a whole page of it."""
    for match in LINK.finditer(text):
        parts = urlsplit(match.group())
        # Some links put their parameters after the page fragment: index.html#/log?authkey=...
        query = parts.query or parts.fragment.partition("?")[2]
        params = dict(parse_qsl(query))
        if params.get(AUTHKEY):
            return params
    raise LinkError("No wish history link found. Paste the whole text from the error page.")


def history_url(params: dict[str, str], banner: str, end_id: str, api: str = API_URL) -> str:
    """The API request for one page of `banner`, older than the pull `end_id` ("0": newest)."""
    # Paging is set here, whatever the pasted link holds.
    query = {
        **params,
        "gacha_type": banner,
        "page": "1",
        "size": str(PAGE_SIZE),
        "end_id": end_id,
        "lang": "en",
    }
    return f"{api}?{urlencode(query)}"


def warp_url(params: dict[str, str], banner: str, end_id: str) -> str:
    """The Star Rail API request for one page of the warp banner `banner`."""
    method = "getLdGachaLog" if banner in COLLABORATION_WARPS else "getGachaLog"
    return history_url(params, banner, end_id, WARP_API + method)


def fetch(url: str) -> bytes:
    """Download one page. `url` must come from history_url, which fixes the host."""
    request = Request(url, headers={"User-Agent": USER_AGENT})  # noqa: S310 - API_URL is https
    try:
        with urlopen(request, timeout=TIMEOUT_SECONDS) as response:  # noqa: S310
            body: bytes = response.read(MAX_RESPONSE_BYTES + 1)
    except OSError as error:  # an HTTP error status, no connection, DNS failure, timeout
        raise HistoryError(*UNREACHABLE) from error
    if len(body) > MAX_RESPONSE_BYTES:
        raise HistoryError(*UNREADABLE)
    return body


def parse_page(body: bytes) -> Page:
    """One page of the history."""
    try:
        answer = _Answer.model_validate_json(body)
    except (ValidationError, json.JSONDecodeError) as error:
        raise HistoryError(*UNREADABLE) from error
    if answer.retcode != SUCCESS:
        code = EXPIRED if answer.message == EXPIRED_MESSAGE else answer.retcode
        raise HistoryError(*REFUSALS.get(code, UNREADABLE))
    if answer.data is None:
        raise HistoryError(*UNREADABLE)
    items = answer.data.list
    pulls = [
        Pull(
            id=item.id,
            banner=item.gacha_type,
            time=item.time,
            name=item.name,
            kind=item.item_type,
            rank=item.rank_type,
            item_id=item.item_id,
            gacha_id=item.gacha_id,
        )
        for item in items
    ]
    uid = items[0].uid if items else None
    return Page(uid=uid, timezone=answer.data.region_time_zone, pulls=pulls)
