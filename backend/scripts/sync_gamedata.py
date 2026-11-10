"""Rebuild app/showcase/gamedata.json from the Enka.Network data store.

Run after each game version: uv run python scripts/sync_gamedata.py
"""

import json
from pathlib import Path
from typing import Any
from urllib.request import urlopen

STORE = "https://raw.githubusercontent.com/EnkaNetwork/API-docs/master/store/gi/"
TARGET = Path(__file__).parent.parent / "app" / "showcase" / "gamedata.json"

ELEMENTS = {
    "Fire": "pyro",
    "Water": "hydro",
    "Electric": "electro",
    "Ice": "cryo",
    "Wind": "anemo",
    "Rock": "geo",
    "Grass": "dendro",
    "None": None,  # the Traveler before resonating with an element
}


def load(name: str) -> Any:
    with urlopen(STORE + name, timeout=30) as response:  # noqa: S310 - STORE is constant https
        return json.load(response)


def main() -> None:
    names = load("locs.json")["en"]
    gamedata = {
        "characters": {
            key: {
                "name": names[str(avatar["NameTextMapHash"])],
                "element": ELEMENTS[avatar["Element"]],
                # SideIconName is "/ui/UI_AvatarIcon_Side_Ambor.png"; the portrait has no "Side_".
                "icon": avatar["SideIconName"]
                .removeprefix("/ui/")
                .removesuffix(".png")
                .replace("Side_", ""),
                # Talent ids in display order, each with the id constellations boost it by.
                "talents": [
                    [skill, avatar["ProudMap"][str(skill)]] for skill in avatar["SkillOrder"]
                ],
            }
            for key, avatar in load("avatars.json").items()
        },
        "weapons": {
            key: names[str(weapon["NameTextMapHash"])]
            for key, weapon in load("weapons.json").items()
        },
        "sets": {
            key: names[relic_set["Name"]] for key, relic_set in load("relics.json")["Sets"].items()
        },
    }
    TARGET.write_text(json.dumps(gamedata, ensure_ascii=False, indent=1, sort_keys=True) + "\n")
    print({kind: len(entries) for kind, entries in gamedata.items()})


if __name__ == "__main__":
    main()
