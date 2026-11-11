"""The app with Enka.Network and HoYoverse replaced by test fixtures, for the browser tests.

Run: STATIC_DIR=../frontend/dist uv run python -m tests.e2e_server <port>
"""

import sys
from pathlib import Path
from urllib.parse import parse_qs, urlsplit

import uvicorn

from app.main import app
from app.showcase import api
from app.showcase.enka import EnkaError
from app.starrail import api as starrail_api
from app.wishes import api as wishes_api
from tests.gacha_fixture import body

FIXTURE = (Path(__file__).parent / "fixtures" / "enka_showcase.json").read_bytes()
STARRAIL_FIXTURE = (Path(__file__).parent / "fixtures" / "enka_starrail.json").read_bytes()
MISSING_UID = "404000000"
ENKA_NOT_FOUND = 404


def fetch(uid: str) -> bytes:
    if uid == MISSING_UID:
        raise EnkaError(ENKA_NOT_FOUND)
    return FIXTURE


def fetch_history(url: str) -> bytes:
    params = parse_qs(urlsplit(url).query)
    return body(params["gacha_type"][0], params["end_id"][0])


def fetch_starrail(uid: str) -> bytes:
    if uid == MISSING_UID:
        raise EnkaError(ENKA_NOT_FOUND)
    return STARRAIL_FIXTURE


app.dependency_overrides[api.get_fetch] = lambda: fetch
app.dependency_overrides[starrail_api.get_fetch] = lambda: fetch_starrail
app.dependency_overrides[wishes_api.get_history_fetch] = lambda: fetch_history
# The whole suite arrives from one address within a minute.
api.limiter.limit = 10_000

if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=int(sys.argv[1]), log_level="warning")
