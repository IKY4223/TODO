import json
from collections.abc import Callable, Iterator
from urllib.parse import parse_qs, urlsplit

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.wishes import api
from tests.gacha_fixture import AUTHKEY, UID, pull

URL = "/api/wishes/warps"
client = TestClient(app)
Fetch = Callable[[str], bytes]
# The Star Rail history page, as Android shows its address once it fails to load offline.
STAR_RAIL_TEXT = (
    "The webpage at https://webstatic-sea.hoyoverse.com/hkrpg/event/e20211215gacha-v2/index.html"
    "?authkey_ver=1&sign_type=2&auth_appid=webview_gacha&lang=en&game_biz=hkrpg_global"
    "&authkey=a%2Bb%2Fc%3D%3D&region=prod_official_eur#/log could not be loaded"
)


@pytest.fixture
def hoyoverse() -> Iterator[list[str]]:
    requested: list[str] = []

    def fetch(url: str) -> bytes:
        requested.append(url)
        banner = parse_qs(urlsplit(url).query)["gacha_type"][0]
        item = pull(1, "Acheron", 5, banner=banner)
        return json.dumps({"retcode": 0, "message": "OK", "data": {"list": [item]}}).encode()

    app.dependency_overrides[api.get_history_fetch] = lambda: fetch
    yield requested
    app.dependency_overrides.clear()


@pytest.mark.parametrize(
    ("banner", "path"), [("11", "/getGachaLog"), ("1", "/getGachaLog"), ("21", "/getLdGachaLog")]
)
def test_reads_a_warp_banner_from_star_rails_own_api(
    hoyoverse: list[str], banner: str, path: str
) -> None:
    response = client.post(URL, json={"link": STAR_RAIL_TEXT, "banner": banner, "end_id": "0"})
    assert response.status_code == 200
    assert response.json()["uid"] == UID
    assert response.json()["pulls"][0]["rank"] == 5
    sent = urlsplit(hoyoverse[0])
    assert sent.netloc == "public-operation-hkrpg-sg.hoyoverse.com"
    assert sent.path == f"/common/hkrpg_gacha_record/api{path}"
    query = parse_qs(sent.query)
    assert query["authkey"] == [AUTHKEY]
    assert query["gacha_type"] == [banner]
    assert query["game_biz"] == ["hkrpg_global"]


def test_only_star_rail_warp_banners_are_asked_for(hoyoverse: list[str]) -> None:
    response = client.post(URL, json={"link": STAR_RAIL_TEXT, "banner": "301", "end_id": "0"})
    assert response.status_code == 422
    assert hoyoverse == []
