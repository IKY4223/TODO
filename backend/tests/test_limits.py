from app.limits import render


def test_limits_are_rendered_as_typescript_constants() -> None:
    lines = render().splitlines()
    assert lines[0].startswith("// Generated")
    assert "export const MAX_PITY = 89" in lines
    assert "export const MAX_COPIES = 7" in lines
    assert "export const MIN_RESISTANCE = -1" in lines
    # A string must survive as a TypeScript literal, backslash included.
    assert 'export const UID_PATTERN = "^\\\\d{9,10}$"' in lines
