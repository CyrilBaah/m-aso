"""Shared conversation rooms, held in memory only.

Nothing here touches disk: when the process stops, every room and transcript is gone.
Rooms that sit idle are dropped after ROOM_TTL.
"""

from __future__ import annotations

import asyncio
import random
import string
import time
from dataclasses import dataclass, field
from typing import Literal

from fastapi import WebSocket

ROOM_TTL = 2 * 60 * 60  # seconds
LineKind = Literal["speech", "typed"]


@dataclass
class Line:
    id: int
    kind: LineKind
    speaker: str
    text: str
    at: float = field(default_factory=time.time)

    def as_event(self) -> dict:
        return {"type": "caption", "id": self.id, "kind": self.kind, "speaker": self.speaker, "text": self.text, "final": True}


@dataclass
class Room:
    code: str
    clients: dict[WebSocket, str] = field(default_factory=dict)  # socket → participant name
    lines: list[Line] = field(default_factory=list)
    touched: float = field(default_factory=time.time)
    _seq: int = 0

    def add_line(self, kind: LineKind, speaker: str, text: str) -> Line:
        self._seq += 1
        line = Line(self._seq, kind, speaker, text)
        self.lines.append(line)
        self.touched = time.time()
        return line

    def transcript(self) -> str:
        tag = {"speech": "said", "typed": "typed"}
        return "\n".join(f"{l.speaker} ({tag[l.kind]}): {l.text}" for l in self.lines)

    async def broadcast(self, event: dict) -> None:
        dead = []
        for ws in list(self.clients):
            try:
                await ws.send_json(event)
            except Exception:  # the socket closed between our check and the send
                dead.append(ws)
        for ws in dead:
            self.clients.pop(ws, None)

    async def announce_presence(self) -> None:
        await self.broadcast({"type": "presence", "participants": len(self.clients)})


class RoomHub:
    def __init__(self) -> None:
        self.rooms: dict[str, Room] = {}
        self._lock = asyncio.Lock()

    @staticmethod
    def new_code() -> str:
        return "".join(random.choices(string.ascii_uppercase, k=4)) + "-" + "".join(random.choices(string.digits, k=3))

    async def create(self) -> Room:
        async with self._lock:
            self._expire()
            code = self.new_code()
            while code in self.rooms:
                code = self.new_code()
            room = self.rooms[code] = Room(code)
            return room

    def get(self, code: str) -> Room | None:
        self._expire()
        return self.rooms.get(code.upper())

    def get_or_create(self, code: str) -> Room:
        """Joining by a valid code always works, so a room survives a service restart mid-demo."""
        code = code.upper()
        room = self.get(code)
        if room is None:
            room = self.rooms[code] = Room(code)
        return room

    def delete(self, code: str) -> bool:
        return self.rooms.pop(code.upper(), None) is not None

    def _expire(self) -> None:
        cutoff = time.time() - ROOM_TTL
        for code in [c for c, r in self.rooms.items() if r.touched < cutoff and not r.clients]:
            del self.rooms[code]
