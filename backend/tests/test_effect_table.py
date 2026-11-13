"""The frontend's effect tables name characters, light cones and sets by id: each must exist.

A sync after a game version would otherwise leave a renamed or mistyped id silently matching
nothing. Read here, in the backend, so the frontend builds without the backend's files.
"""

import json
import re
from pathlib import Path

ROOT = Path(__file__).parents[2]
TABLE = (ROOT / "frontend" / "src" / "starrail" / "effects.ts").read_text(encoding="utf-8")
DATA = json.loads((ROOT / "backend" / "app" / "starrail" / "gamedata.json").read_text("utf-8"))
GROUPS = {"character": "characters", "owner": "characters", "cone": "light_cones", "set": "sets"}


def test_every_id_in_the_effect_tables_is_in_the_game_data() -> None:
    found = re.findall(r"\b(character|owner|cone|set): (\d+)", TABLE)
    assert len(found) > 50  # the pattern still matches how the tables are written
    missing = [f"{field} {id_}" for field, id_ in found if id_ not in DATA[GROUPS[field]]]
    assert missing == []
