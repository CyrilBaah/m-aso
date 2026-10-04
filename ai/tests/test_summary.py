import json

import httpx
import pytest
from fastapi.testclient import TestClient

from maso_ai import main
from maso_ai.summarization import Gemma, clean

client = TestClient(main.app)


def fake_ollama(reply: dict | str, status: int = 200, seen: list | None = None) -> httpx.MockTransport:
    def handle(request: httpx.Request) -> httpx.Response:
        if request.url.path == "/api/tags":
            return httpx.Response(200, json={"models": [{"name": "gemma3:4b"}]})
        if seen is not None:
            seen.append(json.loads(request.content))
        content = reply if isinstance(reply, str) else json.dumps(reply)
        return httpx.Response(status, json={"message": {"role": "assistant", "content": content}})

    return httpx.MockTransport(handle)


@pytest.fixture
def use_gemma(monkeypatch):
    def install(transport: httpx.MockTransport) -> None:
        monkeypatch.setattr(main, "gemma", Gemma("http://ollama.test", "gemma3:4b", transport=transport))

    return install


GOOD = {
    "decisions": ["Client meeting moved to Thursday at 2 PM", "  "],
    "action_items": [{"task": "Send the agenda", "owner": "Ama", "due": "Before Thursday"}, {"task": "", "owner": None, "due": None}],
    "key_dates": ["Thursday at 2 PM", "thursday at 2 pm"],
    "open_questions": [],
}


def test_summary_uses_the_room_transcript(use_gemma):
    seen: list = []
    use_gemma(fake_ollama(GOOD, seen=seen))
    with client.websocket_connect("/rooms/SUMM-001/ws?name=Ama") as ws:
        for _ in range(3):
            ws.receive_json()
        ws.send_json({"type": "reply", "text": "I will send the agenda before Thursday."})
        ws.receive_json()
        res = client.post("/rooms/SUMM-001/summary", json={})
    assert res.status_code == 200
    body = res.json()
    assert body["source"] == "room"
    assert body["summary"] == {
        "decisions": ["Client meeting moved to Thursday at 2 PM"],
        "action_items": [{"task": "Send the agenda", "owner": "Ama", "due": "Before Thursday"}],
        "key_dates": ["Thursday at 2 PM"],
        "open_questions": [],
    }
    request = seen[0]
    assert request["model"] == "gemma3:4b" and request["format"]["required"]
    assert "Ama (typed): I will send the agenda before Thursday." in request["messages"][1]["content"]


def test_browser_lines_are_used_when_the_room_has_no_transcript(use_gemma):
    use_gemma(fake_ollama(GOOD))
    res = client.post("/rooms/DEMO-002/summary", json={"lines": [{"speaker": "You", "kind": "speech", "text": "Meeting moved to Thursday."}]})
    assert res.status_code == 200 and res.json()["source"] == "browser"


def test_empty_conversation_is_409(use_gemma):
    use_gemma(fake_ollama(GOOD))
    assert client.post("/rooms/EMPT-003/summary", json={"lines": []}).status_code == 409


def test_missing_model_is_503_with_a_fix(use_gemma):
    use_gemma(fake_ollama("model not found", status=404))
    res = client.post("/rooms/MISS-004/summary", json={"lines": [{"text": "hello"}]})
    assert res.status_code == 503 and "ollama pull gemma3:4b" in res.json()["detail"]


def test_garbled_output_is_502(use_gemma):
    use_gemma(fake_ollama("not json at all"))
    assert client.post("/rooms/BADJ-005/summary", json={"lines": [{"text": "hello"}]}).status_code == 502


def test_clean_drops_blanks_and_duplicates():
    assert clean({"decisions": ["A", "a", ""], "action_items": [{"task": " X ", "owner": "", "due": None}]}) == {
        "decisions": ["A"],
        "action_items": [{"task": "X", "owner": None, "due": None}],
        "key_dates": [],
        "open_questions": [],
    }
