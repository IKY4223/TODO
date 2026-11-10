import pytest

from app.damage import api as damage_api
from app.showcase import api as showcase_api
from app.wishes import api as wishes_api


@pytest.fixture(autouse=True)
def fresh_rate_limits() -> None:
    """Every test starts with its full request allowance."""
    damage_api.limiter.clear()
    showcase_api.limiter.clear()
    wishes_api.limiter.clear()
    wishes_api.history_limiter.clear()
