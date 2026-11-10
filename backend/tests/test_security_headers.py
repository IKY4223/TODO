import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


@pytest.mark.parametrize("url", ["/api/health", "/api/nowhere", "/api/showcase/12345"])
def test_every_response_limits_what_a_page_may_load(url: str) -> None:
    headers = client.get(url).headers
    policy = headers["Content-Security-Policy"]
    assert "default-src 'self'" in policy
    assert "img-src 'self' https://enka.network" in policy  # icons come from Enka's image host
    assert "frame-ancestors 'none'" in policy
    assert headers["X-Content-Type-Options"] == "nosniff"
    assert headers["Referrer-Policy"] == "no-referrer"


@pytest.mark.parametrize("url", ["/docs", "/redoc"])
def test_api_docs_load_their_own_scripts(url: str) -> None:
    response = client.get(url)
    assert response.status_code == 200
    assert "Content-Security-Policy" not in response.headers
