FROM node:26-slim AS frontend
WORKDIR /frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
# A test checks the effect tables against the game data; the build type-checks tests too.
COPY backend/app/starrail/gamedata.json /backend/app/starrail/gamedata.json
RUN npm run build

FROM python:3.13-slim
COPY --from=ghcr.io/astral-sh/uv:0.11 /uv /bin/uv
WORKDIR /app
COPY backend/pyproject.toml backend/uv.lock ./
RUN uv sync --frozen --no-dev
COPY backend/app ./app
COPY --from=frontend /frontend/dist ./static
ENV PATH="/app/.venv/bin:$PATH"
# Where the Telegram bot may keep its state (TELEGRAM_STATE_FILE); mount a volume on it.
RUN mkdir /data && chown nobody /data
USER nobody
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
