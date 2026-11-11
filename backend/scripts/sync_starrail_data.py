"""Rebuild app/starrail/gamedata.json from the Enka.Network data store for Honkai: Star Rail.

Run after each game version: uv run python scripts/sync_starrail_data.py
"""

import json
from pathlib import Path
from typing import Any
from urllib.request import urlopen

STORE = "https://raw.githubusercontent.com/EnkaNetwork/API-docs/master/store/hsr/"
LANGUAGES = ("en", "ru")
# Skill and eidolon texts: Enka's store has none, this community dump of the game data does.
RES = "https://raw.githubusercontent.com/Mar-7th/StarRailRes/master/index_new/"
TEXTS_TARGET = Path(__file__).parent.parent / "app" / "starrail" / "texts.json"
# The dump's skill types -> the kind whose level the showcase carries. A type missing here
# (technique, innate trace) has no level to show.
SKILL_KINDS = {
    "Normal": "basic",
    "BPSkill": "skill",
    "Ultra": "ultimate",
    "Talent": "talent",
    "ElationDamage": "elation",
    "MemospriteSkill": "memosprite_skill",
    "MemospriteTalent": "memosprite_talent",
}
TRACE_MAX_LEVEL = 2
TARGET = Path(__file__).parent.parent / "app" / "starrail" / "gamedata.json"


def load(name: str, source: str = STORE) -> Any:
    with urlopen(source + name, timeout=60) as response:  # noqa: S310 - STORE is constant https
        return json.load(response)


def main() -> None:
    texts = load("hsr.json")

    def names(text_id: object) -> dict[str, str]:
        """The text in every language the app offers."""
        return {language: texts[language][str(text_id)] for language in LANGUAGES}

    relics = load("relics.json")
    affixes = load("affixes.json")
    ranks = load("ranks.json")
    gamedata = {
        "characters": {
            key: {
                "name": names(avatar["AvatarName"]["Hash"]),
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
                "name": names(cone["EquipmentName"]["Hash"]),
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
        "sets": {key: names(relic_set["Name"]) for key, relic_set in relics["Sets"].items()},
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


def texts(language: str) -> dict[str, Any]:
    """Each character's skills and eidolons, described in one language."""
    skills = load(f"{language}/character_skills.json", RES)
    ranks = load(f"{language}/character_ranks.json", RES)
    return {
        key: {
            "skills": [
                {
                    # "Innate Trace" shares the Talent type but has no level in the showcase.
                    "kind": SKILL_KINDS.get(skill["type"])
                    if skill["max_level"] > TRACE_MAX_LEVEL
                    else None,
                    "label": skill["type_text"],
                    "name": skill["name"],
                    "description": skill["desc"],
                    "params": skill["params"],
                }
                for skill in (skills[skill_id] for skill_id in character["skills"])
                if skill["type_text"]  # the unnamed type is the technique's plain attack
            ],
            "eidolons": [
                {"name": ranks[rank]["name"], "description": ranks[rank]["desc"]}
                for rank in character["ranks"]
            ],
        }
        for key, character in load(f"{language}/characters.json", RES).items()
    }


def main_texts() -> None:
    result = {language: texts(language) for language in LANGUAGES}
    TEXTS_TARGET.write_text(json.dumps(result, ensure_ascii=False, indent=1, sort_keys=True) + "\n")
    print({language: len(characters) for language, characters in result.items()})


if __name__ == "__main__":
    main()
    main_texts()
