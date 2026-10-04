# m’aso

**Make room for every voice.**

I used to work on a team where one or two teammates couldn’t hear. In meetings they used captions. When the rest of us wanted to tell them something, we typed what we meant and showed them the screen. That’s where m’aso came from.

Two people open a private room:

- **Live captions.** What one person says appears on both screens about a second later, with their name on it.
- **Typing for everyone.** Anyone can type a message, and it shows just as large as speech. **Show on screen** turns the laptop into a full-screen board of huge, high-contrast text: type it, turn it around.
- **Both of you agree first.** Captions don’t start until everyone in the room has agreed on the consent screen.
- **A note of what was agreed.** At the end, Gemma writes a short summary — decisions, action items, dates — that you both can correct before saving, or delete.

Everything runs on your own laptop with open models: faster-whisper for speech, Gemma through Ollama for the summary. No audio or text goes to a third party, it costs nothing to run, and the models can be swapped in one line.

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

- Captions start only when everyone in the room has agreed on the consent screen; the AI service enforces this, and pauses captions if someone new joins without agreeing. Everyone sees whenever captions are on.
- Audio lives in memory only for the phrase being transcribed. Rooms and transcripts are in memory and vanish when everyone leaves for two hours, or immediately on **Delete session**.
- Summaries are labelled as written by Gemma, and every row can be corrected or removed before saving.
