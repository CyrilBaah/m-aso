"""Settings, read from the environment. A local `ai/.env` file is loaded first if present."""

from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

WHISPER_MODEL = os.environ.get("MASO_WHISPER_MODEL", "small.en")
WEB_ORIGINS = [o.strip() for o in os.environ.get("MASO_WEB_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000").split(",") if o.strip()]
LOAD_MODELS = os.environ.get("MASO_LOAD_MODELS", "1") == "1"
