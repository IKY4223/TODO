import base64
import binascii
import os
import secrets
from collections.abc import Awaitable, Callable
from pathlib import Path
from typing import Literal

from fastapi import FastAPI, Request
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse, Response
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from app.damage.api import router as damage_router
from app.showcase.api import router as showcase_router
from app.starrail.api import characters_router, relics_router
from app.starrail.api import router as starrail_router
from app.wishes.api import router as wishes_router

app = FastAPI(title="HoYo Toolkit API")
app.include_router(damage_router)
app.include_router(showcase_router)
app.include_router(starrail_router)
app.include_router(relics_router)
app.include_router(characters_router)
app.include_router(wishes_router)

# The pages FastAPI generates for the API docs load scripts from a CDN.
DOCS_PATHS = ("/docs", "/redoc")
SECURITY_HEADERS = {
    # Scripts, styles and requests only from this origin; icons also from Enka's image host.
    "Content-Security-Policy": (
        "default-src 'self'; img-src 'self' https://enka.network; object-src 'none'; "
        "base-uri 'none'; form-action 'self'; frame-ancestors 'none'"
    ),
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",  # the image host must not learn which page asked
    # Private until the launch checklist in CLAUDE.md is done: search engines must not list it.
    "X-Robots-Tag": "noindex, nofollow",
}
# A test deploy can ask for a password: set SITE_PASSWORD on the host. The host's health check
# must still reach the app.
OPEN_PATHS = ("/api/health",)


def _password_given(request: Request, password: str) -> bool:
    scheme, _, token = request.headers.get("Authorization", "").partition(" ")
    if scheme.lower() != "basic":
        return False
    try:
        given = base64.b64decode(token, validate=True).decode().partition(":")[2]
    except (binascii.Error, UnicodeDecodeError):
        return False
    return secrets.compare_digest(given.encode(), password.encode())


@app.middleware("http")
async def ask_for_password(
    request: Request, call_next: Callable[[Request], Awaitable[Response]]
) -> Response:
    password = os.environ.get("SITE_PASSWORD", "")
    if password and request.url.path not in OPEN_PATHS and not _password_given(request, password):
        return Response(
            status_code=401,
            headers={"WWW-Authenticate": 'Basic realm="HoYo Toolkit", charset="UTF-8"'},
        )
    return await call_next(request)


@app.middleware("http")
async def add_security_headers(
    request: Request, call_next: Callable[[Request], Awaitable[Response]]
) -> Response:
    response = await call_next(request)
    if request.url.path not in DOCS_PATHS:
        response.headers.update(SECURITY_HEADERS)
    return response


@app.exception_handler(RequestValidationError)
async def report_invalid_request(_request: Request, error: RequestValidationError) -> JSONResponse:
    # The default handler echoes the rejected input back and crashes when that input is NaN,
    # which a JSON response cannot carry.
    problems = [
        {field: value for field, value in problem.items() if field != "input"}
        for problem in error.errors()
    ]
    return JSONResponse({"detail": jsonable_encoder(problems)}, status_code=422)


class Health(BaseModel):
    status: Literal["ok"]


@app.get("/api/health")
def health() -> Health:
    return Health(status="ok")


# The Docker image ships the built frontend; in dev Vite serves it instead.
static_dir = Path(os.environ.get("STATIC_DIR", "static"))
if static_dir.is_dir():
    # Mounted last so it never shadows /api routes.
    app.mount("/", StaticFiles(directory=static_dir, html=True), name="frontend")
