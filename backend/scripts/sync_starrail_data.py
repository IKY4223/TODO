"""Rebuild app/starrail/gamedata.json from the Enka.Network data store for Honkai: Star Rail.

Run after each game version: uv run python scripts/sync_starrail_data.py
"""

import json
from pathlib import Path
from typing import Any
from urllib.request import urlopen

STORE = "https://raw.githubusercontent.com/EnkaNetwork/API-docs/master/store/hsr/"
TARGET = Path(__file__).parent.parent / "app" / "starrail" / "gamedata.json"


def load(name: str) -> Any:
    with urlopen(STORE + name, timeout=30) as response:  # noqa: S310 - STORE is constant https
        return json.load(response)


def main() -> None:
    names = load("hsr.json")["en"]
    relics = load("relics.json")
    affixes = load("affixes.json")
    ranks = load("ranks.json")
    gamedata = {
        "characters": {
            key: {
                "name": names[avatar["AvatarName"]["Hash"]],
                "rarity": avatar["Rarity"],
                "element": avatar["Element"],
                "path": avatar["AvatarBaseType"],
                "icon": avatar["AvatarSideIconPath"],
                "eidolons": [
                    {
                        int(point) % 1000: levels
                        for point, levels in ranks[str(rank)]["SkillAddLevelList"].items()
                    }
                    for rank in avatar["RankIDList"]
                ],
            }
            for key, avatar in load("avatars.json").items()
        },
        "profile_icons": {key: icon["Icon"] for key, icon in load("pfps.json").items()},
        "light_cones": {
            key: {
                "name": names[cone["EquipmentName"]["Hash"]],
                "rarity": cone["Rarity"],
                # The store only names the 2 MB full-size art; the game's square icon is
                # 30 KB and sits at a path built from the id.
                "icon": f"/ui/hsr/SpriteOutput/ItemIcon/LightConeIcons/{key}.png",
            }
            for key, cone in load("weapons.json").items()
        },
        "relics": {
            key: {
                "slot": item["Type"],
                "set": item["SetID"],
                "rarity": item["Rarity"],
                "main_group": item["MainAffixGroup"],
                "sub_group": item["SubAffixGroup"],
                "icon": item["Icon"],
            }
            for key, item in relics["Items"].items()
        },
        "sets": {key: names[relic_set["Name"]] for key, relic_set in relics["Sets"].items()},
        # A main stat is base + per level; a substat is base per roll + step per roll upgrade.
        "main_affixes": {
            group: {
                key: [affix["Property"], affix["BaseValue"], affix["LevelAdd"]]
                for key, affix in entries.items()
            }
            for group, entries in affixes["MainAffix"].items()
        },
        "sub_affixes": {
            group: {
                key: [affix["Property"], affix["BaseValue"], affix["StepValue"]]
                for key, affix in entries.items()
            }
            for group, entries in affixes["SubAffix"].items()
        },
    }
    TARGET.write_text(json.dumps(gamedata, ensure_ascii=False, indent=1, sort_keys=True) + "\n")
    print({kind: len(entries) for kind, entries in gamedata.items()})


if __name__ == "__main__":
    main()
