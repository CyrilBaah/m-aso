# m’aso AI service

FastAPI service behind the m’aso web app. Everything runs on this machine; no audio or text is sent to a third party.

- **Rooms:** shared conversation rooms over WebSocket, held in memory only.
- **Live captions:** the browser streams 16 kHz audio; faster-whisper turns each spoken phrase into a caption for everyone in the room. Audio is never written to disk.

## Set up

```bash
cp .env.example .env   # adjust settings if you like
uv sync
```

The first start downloads the Whisper model (`small.en`, about 480 MB) into `~/.cache/huggingface`.

## Run

```bash
uv run uvicorn maso_ai.main:app --reload --port 8000
```

`GET /health` reports whether the Whisper model is `loading`, `ready` or in `error`.

## Test

```bash
uv run pytest -m "not slow"   # fast unit tests
uv run pytest                 # also runs real speech through Whisper (macOS `say` + ffmpeg)
```

> If your shell has a pyenv virtualenv active, uv prints a `VIRTUAL_ENV … does not match` warning. It is harmless: uv always uses this project's `.venv`.
