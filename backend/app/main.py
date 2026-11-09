import os
from pathlib import Path
from typing import Literal

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from app.showcase.api import router as showcase_router
from app.wishes.api import router as wishes_router

app = FastAPI(title="HoYo Toolkit API")
app.include_router(showcase_router)
app.include_router(wishes_router)


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
