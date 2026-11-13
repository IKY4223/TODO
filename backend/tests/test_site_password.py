import base64

import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)
PASSWORD = "test-only"  # noqa: S105 - a fake password for the test


def basic(password: str, user: str = "anyone") -> dict[str, str]:
    token = base64.b64encode(f"{user}:{password}".encode()).decode()
    return {"Authorization": f"Basic {token}"}


def test_without_a_password_the_site_is_open() -> None:
    assert client.get("/api/showcase/1").status_code != 401


def test_with_a_password_every_page_asks_for_it(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("SITE_PASSWORD", PASSWORD)
    refused = client.get("/api/damage")
    assert refused.status_code == 401
    assert refused.headers["WWW-Authenticate"].startswith("Basic")
    assert client.get("/", headers=basic("wrong")).status_code == 401
    assert client.get("/api/showcase/1", headers=basic(PASSWORD)).status_code != 401
    assert client.get("/", headers={"Authorization": "Basic !!!"}).status_code == 401
    assert client.get("/", headers={"Authorization": "Bearer x"}).status_code == 401


def test_the_health_check_stays_open_for_the_host(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("SITE_PASSWORD", PASSWORD)
    assert client.get("/api/health").status_code == 200


def test_no_page_asks_search_engines_to_list_it() -> None:
    assert client.get("/api/health").headers["X-Robots-Tag"] == "noindex, nofollow"
