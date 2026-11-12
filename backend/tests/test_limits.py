from app.limits import render


def test_limits_are_rendered_as_typescript_constants() -> None:
    lines = render().splitlines()
    assert lines[0].startswith("// Generated")
    assert any(
        line.startswith("export const WISH_BANNERS = {")
        and '"starrail_light_cone": {"max_pity": 79, "max_copies": 5}' in line
        and line.endswith("} as const")
        for line in lines
    )
    assert "export const MIN_RESISTANCE = -1" in lines
    # A string must survive as a TypeScript literal, backslash included.
    assert 'export const UID_PATTERN = "^\\\\d{9,10}$"' in lines
    assert "export const MAX_RELIC_LEVEL = 15" in lines
    # A list keeps its items as literal types.
    assert any(
        line.startswith('export const RELIC_SUBSTATS = ["hp", "atk"')
        and line.endswith("] as const")
        for line in lines
    )
