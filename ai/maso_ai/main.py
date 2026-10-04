"""HTTP + WebSocket API used by the Next.js app."""

from __future__ import annotations

import os
import re

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from .rooms import RoomHub

CODE = re.compile(r"^[A-Z]{4}-[0-9]{3}$")
WEB_ORIGINS = os.environ.get("MASO_WEB_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000").split(",")

app = FastAPI(title="m’aso AI service")
app.add_middleware(CORSMiddleware, allow_origins=WEB_ORIGINS, allow_methods=["*"], allow_headers=["*"])
hub = RoomHub()


def valid_code(code: str) -> str:
    code = code.upper()
    if not CODE.match(code):
        raise HTTPException(status_code=422, detail="Room codes are four letters and three numbers, like WORK-482.")
    return code


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "rooms": len(hub.rooms)}


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


@app.websocket("/rooms/{code}/ws")
async def room_socket(ws: WebSocket, code: str, name: str = "Participant") -> None:
    code = code.upper()
    if not CODE.match(code):
        await ws.close(code=4422, reason="invalid room code")
        return
    await ws.accept()
    room = hub.get_or_create(code)
    room.clients[ws] = name[:40] or "Participant"
    await ws.send_json({"type": "history", "lines": [l.as_event() for l in room.lines[-20:]]})
    await room.announce_presence()
    try:
        while True:
            message = await ws.receive_json()
            if message.get("type") == "reply":
                text = str(message.get("text", "")).strip()[:500]
                if text:
                    await room.broadcast(room.add_line("typed", room.clients[ws], text).as_event())
    except WebSocketDisconnect:
        pass
    finally:
        room.clients.pop(ws, None)
        await room.announce_presence()
