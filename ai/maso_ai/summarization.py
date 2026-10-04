"""Conversation summaries with Gemma, served locally by Ollama.

Gemma reads the transcript once, at the end of the conversation, and returns structured
JSON (decisions, action items, key dates, open questions). Ollama runs on this machine, so the
transcript never leaves it.
"""

from __future__ import annotations

import json
import logging
from typing import Any

import httpx

log = logging.getLogger("maso.gemma")

SYSTEM = """You summarise workplace conversations for m’aso, a captioning tool used by Deaf and \
hard-of-hearing colleagues. Read the transcript and record only what was actually said.

Rules:
- Never invent decisions, people, dates or tasks. If something is unclear, leave it out.
- Keep each item short and plain: at most 15 words, no filler.
- Use the speakers' own wording for dates and times ("Thursday at 2 PM").
- An action item's owner is the person who will do it, if the transcript says so; otherwise null.
- Return empty lists when there is nothing to report."""

SCHEMA: dict[str, Any] = {
    "type": "object",
    "properties": {
        "decisions": {"type": "array", "items": {"type": "string"}},
        "action_items": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "task": {"type": "string"},
                    "owner": {"type": ["string", "null"]},
                    "due": {"type": ["string", "null"]},
                },
                "required": ["task", "owner", "due"],
            },
        },
        "key_dates": {"type": "array", "items": {"type": "string"}},
        "open_questions": {"type": "array", "items": {"type": "string"}},
    },
    "required": ["decisions", "action_items", "key_dates", "open_questions"],
}


class GemmaUnavailable(RuntimeError):
    """Ollama is not running, or the model has not been pulled."""


class Gemma:
    def __init__(self, url: str, model: str, transport: httpx.AsyncBaseTransport | None = None) -> None:
        self.url = url.rstrip("/")
        self.model = model
        self._transport = transport  # tests swap in a fake Ollama

    def _client(self, timeout: float) -> httpx.AsyncClient:
        return httpx.AsyncClient(base_url=self.url, timeout=timeout, transport=self._transport)

    async def status(self) -> str:
        """ready | missing_model | offline"""
        try:
            async with self._client(3) as client:
                tags = (await client.get("/api/tags")).json()
        except (httpx.HTTPError, ValueError):
            return "offline"
        names = {m.get("name", "") for m in tags.get("models", [])}
        wanted = self.model if ":" in self.model else f"{self.model}:latest"
        return "ready" if wanted in names else "missing_model"

    async def summarise(self, transcript: str) -> dict[str, Any]:
        body = {
            "model": self.model,
            "stream": False,
            "format": SCHEMA,
            "options": {"temperature": 0.1},
            "keep_alive": "10m",
            "messages": [
                {"role": "system", "content": SYSTEM},
                {"role": "user", "content": f"Transcript:\n{transcript}"},
            ],
        }
        try:
            async with self._client(180) as client:
                res = await client.post("/api/chat", json=body)
        except httpx.HTTPError as exc:
            raise GemmaUnavailable(f"Ollama is not reachable at {self.url}.") from exc
        if res.status_code == 404:
            raise GemmaUnavailable(f"The {self.model} model is not installed. Run: ollama pull {self.model}")
        res.raise_for_status()
        content = res.json()["message"]["content"]
        try:
            return clean(json.loads(content))
        except (json.JSONDecodeError, TypeError) as exc:
            log.warning("Gemma returned non-JSON output: %r", content[:200])
            raise ValueError("The summary could not be read. Try again.") from exc


def clean(raw: dict[str, Any]) -> dict[str, Any]:
    """Trim, drop empties and de-duplicate, so the UI never shows blank or repeated rows."""

    def strings(items: Any) -> list[str]:
        out: list[str] = []
        for item in items if isinstance(items, list) else []:
            text = str(item).strip()
            if text and text.lower() not in {o.lower() for o in out}:
                out.append(text)
        return out

    actions = []
    for item in raw.get("action_items") or []:
        if isinstance(item, dict) and str(item.get("task", "")).strip():
            actions.append(
                {
                    "task": str(item["task"]).strip(),
                    "owner": (str(item["owner"]).strip() or None) if item.get("owner") else None,
                    "due": (str(item["due"]).strip() or None) if item.get("due") else None,
                }
            )
    return {
        "decisions": strings(raw.get("decisions")),
        "action_items": actions,
        "key_dates": strings(raw.get("key_dates")),
        "open_questions": strings(raw.get("open_questions")),
    }
