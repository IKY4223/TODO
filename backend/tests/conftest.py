import pytest

from app.showcase import api as showcase_api
from app.wishes import api as wishes_api


@pytest.fixture(autouse=True)
def fresh_rate_limits() -> None:
    """Every test starts with its full request allowance."""
    showcase_api.limiter.clear()
    wishes_api.limiter.clear()
