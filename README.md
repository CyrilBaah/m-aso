# m’aso

**Make room for every voice.** m’aso gives Deaf and hard-of-hearing colleagues live captions, typed replies and a private record of what was agreed.

Two people open a shared room. Whatever one says is captioned live on both screens; either can type a reply that appears just as large. Dates, times and follow-ups are picked out as they’re said. At the end, Gemma writes a short summary that both can correct before saving, or delete outright.

Everything runs on your own machine: speech is transcribed by faster-whisper and summarised by Gemma through Ollama. No audio or text goes to a third party, and raw audio is never stored.

## How it fits together

```
Browser (Next.js, web/)                      AI service (FastAPI, ai/)
  microphone → AudioWorklet → 16 kHz PCM ──▶  WebSocket /rooms/{code}/ws
                                               ├─ Segmenter: splits speech on pauses
  captions, replies, presence ◀────────────   ├─ faster-whisper (small.en, int8, CPU)
                                               └─ room hub: broadcasts to everyone
  end of conversation ── POST /summary ────▶  Gemma 3 via Ollama → decisions, actions, dates
```

| Folder | What it is |
|---|---|
| `web/` | Next.js 16 app: the eight screens, built on the m’aso design system ([docs/DESIGN.md](docs/DESIGN.md)) |
| `ai/` | Python service: shared rooms, live captions, summaries ([ai/README.md](ai/README.md)) |
| `scripts/` | `setup.sh` once, then `dev.sh` to run everything |

## Run it

Needs macOS or Linux with Node 20+, [uv](https://docs.astral.sh/uv/) and, for summaries, [Ollama](https://ollama.com) (`brew install ollama`).

```bash
scripts/setup.sh   # env files, dependencies, Gemma model (one time)
scripts/dev.sh     # Ollama + AI service + web app
```

Open http://localhost:3000. To try a two-person room on one machine, open the room link in a second browser window.

Settings live in `ai/.env` (models, allowed origins) and `web/.env.local` (where the AI service is). The committed `.env.example` files list every option.

On an 8 GB Apple Silicon Mac: Whisper `small.en` captions a phrase about a second after it’s spoken; Gemma 3 4B writes a summary in 5–10 seconds once warm (the first one after starting Ollama takes longer while the model loads). `base.en` and `gemma3:1b` are lighter options.

## Test

```bash
cd ai && uv run pytest             # unit tests + real speech through Whisper + real Gemma
cd web && npm run test:e2e         # Playwright against the real app and AI service
```

The end-to-end suite starts both servers if needed. Its live test runs two Chrome windows in one room: one microphone plays speech generated with macOS `say`, and the other window must show the caption.

## Privacy

- Each person agrees on the consent screen before entering the room, and everyone in the room sees whenever captions are on.
- Audio lives in memory only for the phrase being transcribed. Rooms and transcripts are in memory and vanish when everyone leaves for two hours, or immediately on **Delete session**.
- Summaries are labelled as written by Gemma, and every row can be corrected or removed before saving.
