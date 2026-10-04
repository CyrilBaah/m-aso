"""End to end against a real server: macOS speech → WebSocket → faster-whisper → caption.

Needs the real Whisper model, so it is marked slow: `uv run pytest -m slow`.
"""

import asyncio
import json
import shutil
import socket
import subprocess
import threading
import time

import numpy as np
import pytest
import uvicorn
import websockets

from maso_ai import main

pytestmark = pytest.mark.slow


@pytest.fixture(scope="module")
def spoken_pcm(tmp_path_factory) -> bytes:
    if not (shutil.which("say") and shutil.which("ffmpeg")):
        pytest.skip("needs macOS `say` and ffmpeg")
    d = tmp_path_factory.mktemp("speech")
    subprocess.run(["say", "-o", str(d / "s.aiff"), "The client meeting has moved to Thursday at two PM."], check=True)
    subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", str(d / "s.aiff"), "-ar", "16000", "-ac", "1", "-f", "s16le", str(d / "s.raw")], check=True)
    return (d / "s.raw").read_bytes() + np.zeros(16000, dtype=np.int16).tobytes()  # a second of quiet ends the line


@pytest.fixture(scope="module")
def server_url():
    main.whisper.load_in_background()
    deadline = time.time() + 600
    while main.whisper.status == "loading" and time.time() < deadline:
        time.sleep(0.5)
    if not main.whisper.ready:
        pytest.skip(f"whisper not available: {main.whisper.error}")
    with socket.socket() as s:
        s.bind(("127.0.0.1", 0))
        port = s.getsockname()[1]
    server = uvicorn.Server(uvicorn.Config(main.app, port=port, log_level="warning"))
    thread = threading.Thread(target=server.run, daemon=True)
    thread.start()
    while not server.started:
        time.sleep(0.05)
    yield f"ws://127.0.0.1:{port}"
    server.should_exit = True
    thread.join(timeout=10)


def test_speech_becomes_a_shared_caption(spoken_pcm, server_url):
    async def run() -> list[dict]:
        url = f"{server_url}/rooms/LIVE-123/ws"
        async with websockets.connect(f"{url}?name=Ama") as a, websockets.connect(f"{url}?name=Kofi") as b:
            await a.send(json.dumps({"type": "audio_start", "interim": True}))
            for i in range(0, len(spoken_pcm), 3200):  # 100 ms chunks, like the browser
                await a.send(spoken_pcm[i : i + 3200])
            await a.send(json.dumps({"type": "audio_stop"}))
            seen = []
            while not (seen and seen[-1].get("final")):
                seen.append(json.loads(await asyncio.wait_for(b.recv(), 60)))
            return seen

    events = [e for e in asyncio.run(run()) if e["type"] == "caption"]
    final = events[-1]
    assert final["speaker"] == "Ama" and final["kind"] == "speech"
    assert "meeting" in final["text"].lower() and "thursday" in final["text"].lower()
