import os
from pathlib import Path
from typing import Literal

from fastapi import FastAPI, Request
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from app.damage.api import router as damage_router
from app.showcase.api import router as showcase_router
from app.wishes.api import router as wishes_router

app = FastAPI(title="HoYo Toolkit API")
app.include_router(damage_router)
app.include_router(showcase_router)
app.include_router(wishes_router)


@app.exception_handler(RequestValidationError)
async def report_invalid_request(request: Request, error: RequestValidationError) -> JSONResponse:
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
