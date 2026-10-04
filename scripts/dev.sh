#!/usr/bin/env bash
# Starts m’aso: Ollama (Gemma), the AI service (faster-whisper) and the web app. Ctrl-C stops all of them.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
pids=()
stop() { [ ${#pids[@]} -gt 0 ] && kill "${pids[@]}" 2>/dev/null || true; }
trap stop EXIT INT TERM

if command -v ollama >/dev/null && ! curl -sf localhost:11434/api/tags >/dev/null; then
  ollama serve >/dev/null 2>&1 &
  pids+=($!)
fi
(cd "$ROOT/ai" && env -u VIRTUAL_ENV uv run uvicorn maso_ai.main:app --port 8000) &
pids+=($!)
(cd "$ROOT/web" && npm run dev) &
pids+=($!)

echo
echo "  m’aso        http://localhost:3000"
echo "  AI service   http://localhost:8000/health"
echo
wait
