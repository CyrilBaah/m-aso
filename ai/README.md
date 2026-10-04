# m’aso AI service

FastAPI service behind the m’aso web app. Everything runs on this machine; no audio or text is sent to a third party.

- **Rooms:** shared conversation rooms over WebSocket, held in memory only.
- **Live captions:** the browser streams 16 kHz audio; faster-whisper turns each spoken phrase into a caption for everyone in the room. Audio is never written to disk.
- **Summaries:** at the end of a conversation Gemma (via Ollama) turns the transcript into decisions, action items, key dates and open questions. It is told to record only what was said.

## Set up

```bash
cp .env.example .env   # adjust settings if you like
uv sync
```

The first start downloads the Whisper model (`small.en`, about 480 MB) into `~/.cache/huggingface`.

For summaries, install Ollama and pull Gemma once:

```bash
brew install ollama
ollama serve            # or open the Ollama app
ollama pull gemma3:4b   # about 3.3 GB
```

## Run

```bash
uv run uvicorn maso_ai.main:app --reload --port 8000
```

`GET /health` reports whether Whisper is `loading`, `ready` or in `error`, and whether Gemma is `ready`, `missing_model` or `offline`.

## Test

```bash
uv run pytest -m "not slow"   # fast unit tests
uv run pytest                 # also runs real speech through Whisper (macOS `say` + ffmpeg)
```

> If your shell has a pyenv virtualenv active, uv prints a `VIRTUAL_ENV … does not match` warning. It is harmless: uv always uses this project's `.venv`.
