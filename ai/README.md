# m’aso AI service

FastAPI service behind the m’aso web app.

- **Rooms:** shared conversation rooms over WebSocket, held in memory only.

## Run

```bash
uv sync
uv run uvicorn maso_ai.main:app --reload --port 8000
```

## Test

```bash
uv run pytest
```
