"""The app with Enka.Network replaced by the test fixture, for the browser tests.

Run: STATIC_DIR=../frontend/dist uv run python -m tests.e2e_server <port>
"""

import sys
from pathlib import Path

import uvicorn

from app.main import app
from app.showcase import api
from app.showcase.enka import EnkaError

FIXTURE = (Path(__file__).parent / "fixtures" / "enka_showcase.json").read_bytes()
MISSING_UID = "404000000"
ENKA_NOT_FOUND = 404


def fetch(uid: str) -> bytes:
    if uid == MISSING_UID:
        raise EnkaError(ENKA_NOT_FOUND)
    return FIXTURE


app.dependency_overrides[api.get_fetch] = lambda: fetch
# The whole suite arrives from one address within a minute.
api.limiter.limit = 10_000

if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=int(sys.argv[1]), log_level="warning")
