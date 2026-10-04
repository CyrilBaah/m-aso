"""HTTP + WebSocket API used by the Next.js app."""

from __future__ import annotations

import asyncio
import itertools
import json
import re
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from . import config
from .rooms import Room, RoomHub
from .transcription import Job, Segmenter, Transcriber

CODE = re.compile(r"^[A-Z]{4}-[0-9]{3}$")

hub = RoomHub()
whisper = Transcriber(config.WHISPER_MODEL)
_socket_ids = itertools.count(1)


@asynccontextmanager
async def lifespan(_: FastAPI):
    if config.LOAD_MODELS:
        whisper.load_in_background()
    yield


app = FastAPI(title="m’aso AI service", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=config.WEB_ORIGINS, allow_methods=["*"], allow_headers=["*"])


def valid_code(code: str) -> str:
    code = code.upper()
    if not CODE.match(code):
        raise HTTPException(status_code=422, detail="Room codes are four letters and three numbers, like WORK-482.")
    return code


@app.get("/health")
def health() -> dict:
    return {
        "status": "ok",
        "rooms": len(hub.rooms),
        "whisper": {"model": whisper.model_name, "status": whisper.status, "error": whisper.error},
    }


@app.post("/rooms", status_code=201)
async def create_room() -> dict:
    room = await hub.create()
    return {"code": room.code}


@app.get("/rooms/{code}")
def room_info(code: str) -> dict:
    room = hub.get(valid_code(code))
    if room is None:
        raise HTTPException(status_code=404, detail="No room with that code is open.")
    return {"code": room.code, "participants": len(room.clients), "lines": len(room.lines)}


@app.delete("/rooms/{code}", status_code=204)
def delete_room(code: str) -> None:
    hub.delete(valid_code(code))


async def caption_worker(room: Room, speaker: str, sid: int, jobs: asyncio.Queue[Job | None]) -> None:
    """Transcribes one speaker's utterances in order. Stale interim jobs are skipped."""
    while (job := await jobs.get()) is not None:
        if not job.final and not jobs.empty():
            continue  # newer audio is already waiting; this interim would be out of date
        text = await asyncio.to_thread(whisper.transcribe, job.audio)
        if job.final:
            if text:
                await room.broadcast(room.add_line("speech", speaker, sid, text).as_event())
            else:
                await room.broadcast({"type": "caption", "id": f"live-{sid}", "kind": "speech", "speaker": speaker, "sid": sid, "text": "", "final": False})
        elif text:
            await room.broadcast({"type": "caption", "id": f"live-{sid}", "kind": "speech", "speaker": speaker, "sid": sid, "text": text, "final": False})


@app.websocket("/rooms/{code}/ws")
async def room_socket(ws: WebSocket, code: str, name: str = "Participant") -> None:
    code = code.upper()
    if not CODE.match(code):
        await ws.close(code=4422, reason="invalid room code")
        return
    await ws.accept()
    room = hub.get_or_create(code)
    speaker = name[:40] or "Participant"
    sid = next(_socket_ids)
    room.clients[ws] = speaker
    await ws.send_json({"type": "welcome", "sid": sid, "whisper": whisper.status})
    await ws.send_json({"type": "history", "lines": [l.as_event() for l in room.lines[-20:]]})
    await room.announce_presence()

    segmenter: Segmenter | None = None
    want_interim = True
    jobs: asyncio.Queue[Job | None] = asyncio.Queue()
    worker = asyncio.create_task(caption_worker(room, speaker, sid, jobs))
    try:
        while True:
            message = await ws.receive()
            if message["type"] == "websocket.disconnect":
                break
            if message.get("bytes") is not None:
                if segmenter is not None:  # audio only counts between audio_start and audio_stop
                    for job in segmenter.feed(message["bytes"], want_interim):
                        jobs.put_nowait(job)
                continue
            event = json.loads(message.get("text") or "{}")
            kind = event.get("type")
            if kind == "reply":
                text = str(event.get("text", "")).strip()[:500]
                if text:
                    await room.broadcast(room.add_line("typed", speaker, sid, text).as_event())
            elif kind == "audio_start":
                if not whisper.ready:
                    await ws.send_json({"type": "error", "code": "whisper_" + whisper.status, "message": whisper_message()})
                    continue
                segmenter = Segmenter()
                want_interim = bool(event.get("interim", True))
            elif kind == "audio_stop" and segmenter is not None:
                if (job := segmenter.flush()) is not None:
                    jobs.put_nowait(job)
                segmenter = None
    except WebSocketDisconnect:
        pass
    finally:
        jobs.put_nowait(None)
        room.clients.pop(ws, None)
        await room.announce_presence()
        await asyncio.wait_for(worker, timeout=30)


def whisper_message() -> str:
    if whisper.status == "loading":
        return "Live captions are still warming up. Try again in a moment, or use demo captions."
    if whisper.status == "error":
        return f"Live captions could not start: {whisper.error}"
    return "Live captions are not running on this server."
