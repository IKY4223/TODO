"""Fake wish history responses in the shape HoYoverse's getGachaLog returns.

Built from the format community importers parse (paimon.moe), not recorded from a live
account: a real recording would carry the owner's UID and history.
"""

import json
from typing import Any

UID = "700000001"
PAGE_SIZE = 20
LINK_PARAMS = "authkey_ver=1&sign_type=2&auth_appid=webview_gacha&lang=en&game_biz=hk4e_global"
AUTHKEY = "a+b/c=="  # a real key holds these characters, so the tests do too
ANDROID_TEXT = (  # what Android's error page reads once the history page fails to reload
    "Webpage not available\n\nThe webpage at https://webstatic-sea.hoyoverse.com/genshin/event/"
    f"e20190909gacha-v3/index.html?{LINK_PARAMS}&authkey=a%2Bb%2Fc%3D%3D&region=os_euro#/log "
    "could not be loaded because:\n\nnet::ERR_INTERNET_DISCONNECTED"
)


def pull(
    pull_id: int, name: str, rank: int, *, banner: str = "301", kind: str = "Character"
) -> dict[str, str]:
    return {
        "uid": UID,
        "gacha_type": banner,
        "item_id": "",
        "count": "1",
        "time": f"2026-10-01 12:{pull_id // 60 % 60:02d}:{pull_id % 60:02d}",
        "name": name,
        "lang": "en-us",
        "item_type": kind,
        "rank_type": str(rank),
        "id": str(1_700_000_000_000_000_000 + pull_id),
    }


def history(banner: str) -> list[dict[str, str]]:
    """A banner's pulls, newest first, the order the API pages through them."""
    if banner == "301":
        # 25 pulls: a 5-star on pull 10, then 15 more, so the current pity is 15.
        pulls = [
            pull(
                i,
                "Furina" if i == 10 else "Xiangling",
                5 if i == 10 else 4 if i % 10 == 5 else 3,
                banner="400" if i == 20 else "301",
            )
            for i in range(1, 26)
        ]
    elif banner == "200":
        pulls = [pull(100 + i, "Amber", 4, banner="200") for i in range(1, 4)]
    else:
        pulls = []
    return pulls[::-1]


def page(banner: str, end_id: str) -> dict[str, Any]:
    """One page of `banner`: the PAGE_SIZE pulls older than `end_id` ("0" for the newest)."""
    pulls = history(banner)
    if end_id != "0":
        pulls = [p for p in pulls if int(p["id"]) < int(end_id)]
    return {
        "retcode": 0,
        "message": "OK",
        "data": {
            "page": "0",
            "size": str(PAGE_SIZE),
            "list": pulls[:PAGE_SIZE],
            "region": "os_euro",
        },
    }


def body(banner: str, end_id: str) -> bytes:
    return json.dumps(page(banner, end_id)).encode()
