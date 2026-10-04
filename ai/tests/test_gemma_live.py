"""Real Gemma through Ollama. Slow, and skipped when Ollama or the model is missing."""

import asyncio

import pytest

from maso_ai import config
from maso_ai.summarization import Gemma

pytestmark = pytest.mark.slow

TRANSCRIPT = """Kofi (said): Hi Ama. The client meeting has moved to Thursday at 2 PM.
Ama (typed): Thanks. Is it still in the big conference room?
Kofi (said): Yes. I will send the agenda before the meeting.
Ama (typed): Great. I'll bring the budget slides.
Kofi (said): We also agreed to drop the Friday check-in this week."""


def test_gemma_summarises_without_inventing():
    gemma = Gemma(config.OLLAMA_URL, config.GEMMA_MODEL)
    if asyncio.run(gemma.status()) != "ready":
        pytest.skip(f"{config.GEMMA_MODEL} is not available in Ollama")
    summary = asyncio.run(gemma.summarise(TRANSCRIPT))
    text = str(summary).lower()
    assert "thursday" in text
    assert any("agenda" in a["task"].lower() for a in summary["action_items"])
    assert any("slides" in a["task"].lower() for a in summary["action_items"])
    assert "monday" not in text and "tuesday" not in text  # nothing invented
