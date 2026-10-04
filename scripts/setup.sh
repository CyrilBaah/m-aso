#!/usr/bin/env bash
# One-time setup for m’aso: env files, Python and Node dependencies, and the Gemma model.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

need() { command -v "$1" >/dev/null || { echo "✗ $1 is required: $2"; exit 1; }; }
need node "https://nodejs.org"
need uv "curl -LsSf https://astral.sh/uv/install.sh | sh"

[ -f ai/.env ] || { cp ai/.env.example ai/.env; echo "• created ai/.env"; }
[ -f web/.env.local ] || { cp web/.env.example web/.env.local; echo "• created web/.env.local"; }

echo "• installing the AI service (Python)…"
(cd ai && env -u VIRTUAL_ENV uv sync)
echo "• installing the web app (Node)…"
(cd web && npm install)

MODEL="$(grep -E '^MASO_GEMMA_MODEL=' ai/.env | cut -d= -f2)"
MODEL="${MODEL:-gemma3:4b}"
if command -v ollama >/dev/null; then
  curl -sf localhost:11434/api/tags >/dev/null || { ollama serve >/dev/null 2>&1 & sleep 2; }
  echo "• pulling $MODEL for summaries (one time, ~3 GB for gemma3:4b)…"
  ollama pull "$MODEL"
else
  echo "! Ollama is not installed, so summaries are off. Install it with: brew install ollama"
fi

echo "✓ Ready. Start everything with: scripts/dev.sh"
