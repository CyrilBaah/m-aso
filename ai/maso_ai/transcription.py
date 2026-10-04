"""Live captions with faster-whisper.

The browser streams 16 kHz mono PCM (int16) over the room WebSocket. `Segmenter` cuts that
stream into utterances on pauses, so each caption is a whole phrase, and asks for interim
transcripts while someone is still talking. `Transcriber` owns the Whisper model.

Audio only ever lives in memory, and only for the utterance being transcribed.
"""

from __future__ import annotations

import logging
import threading
from collections import deque
from dataclasses import dataclass, field

import numpy as np

log = logging.getLogger("maso.whisper")

SAMPLE_RATE = 16_000
FRAME = SAMPLE_RATE * 30 // 1000  # 30 ms analysis frames

# Whisper invents these on near-silence. Drop them when they are the whole utterance.
HALLUCINATIONS = {
    "",
    "you",
    "thank you",
    "thank you.",
    "thanks for watching!",
    "thanks for watching.",
    "bye.",
    ".",
}


class Transcriber:
    """Loads the Whisper model in the background so the service starts instantly."""

    def __init__(self, model: str = "small.en") -> None:
        self.model_name = model
        self.status = "idle"  # idle → loading → ready | error
        self.error: str | None = None
        self._model = None
        self._lock = threading.Lock()  # one transcription at a time keeps CPU latency predictable

    def load_in_background(self) -> None:
        if self.status in ("loading", "ready"):
            return
        self.status = "loading"
        threading.Thread(target=self._load, name="whisper-load", daemon=True).start()

    def _load(self) -> None:
        try:
            from faster_whisper import WhisperModel

            # CTranslate2 has no Apple GPU backend; int8 on CPU is the fast path on a Mac.
            self._model = WhisperModel(self.model_name, device="cpu", compute_type="int8")
            self.status = "ready"
            log.info("Whisper model %s ready", self.model_name)
        except Exception as exc:  # surfaced through /health so the UI can explain it
            self.status, self.error = "error", str(exc)
            log.exception("Whisper model failed to load")

    @property
    def ready(self) -> bool:
        return self.status == "ready"

    def transcribe(self, audio: np.ndarray) -> str:
        """audio: float32 mono at 16 kHz in [-1, 1]."""
        if not self.ready:
            return ""
        with self._lock:
            segments, _ = self._model.transcribe(
                audio,
                language="en",
                beam_size=1,
                vad_filter=True,
                condition_on_previous_text=False,
                no_speech_threshold=0.6,
                without_timestamps=True,
            )
            text = " ".join(s.text.strip() for s in segments).strip()
        return "" if text.lower() in HALLUCINATIONS else text


@dataclass
class Job:
    audio: np.ndarray
    final: bool


@dataclass
class Segmenter:
    """Energy-based utterance detection, tuned for a laptop mic in a quiet room."""

    silence_to_end: float = 0.8  # seconds of quiet that end an utterance
    max_utterance: float = 12.0  # force a cut so long speeches still caption
    min_utterance: float = 0.35  # ignore clicks and coughs
    interim_every: float = 1.2  # seconds between interim transcripts
    threshold: float = 0.012  # RMS floor that counts as speech
    _buf: list[np.ndarray] = field(default_factory=list)
    _pending: np.ndarray = field(default_factory=lambda: np.zeros(0, dtype=np.float32))
    _speech: int = 0  # samples of speech in the current utterance
    _quiet: int = 0  # trailing samples of quiet
    _since_interim: int = 0
    _noise: float = 0.004
    _carry: bytes = b""  # half of an int16 sample split across messages
    _preroll: deque = field(default_factory=lambda: deque(maxlen=10))  # 300 ms before speech starts

    @property
    def _length(self) -> int:
        return sum(len(b) for b in self._buf)

    def feed(self, pcm16: bytes, want_interim: bool = True) -> list[Job]:
        data = self._carry + pcm16
        even = len(data) - len(data) % 2
        self._carry = data[even:]
        samples = np.frombuffer(data[:even], dtype=np.int16).astype(np.float32) / 32768.0
        audio = np.concatenate([self._pending, samples])
        whole = len(audio) // FRAME * FRAME
        self._pending = audio[whole:]
        jobs: list[Job] = []
        for start in range(0, whole, FRAME):
            frame = audio[start : start + FRAME]
            rms = float(np.sqrt(np.mean(frame * frame)))
            speaking = rms > max(self.threshold, self._noise * 3)
            if not speaking:
                self._noise = 0.95 * self._noise + 0.05 * rms  # track the room's noise floor
            if self._speech == 0 and not speaking:
                self._preroll.append(frame)  # soft word starts ("p", "f", "h") sit below the threshold
                continue
            if self._speech == 0:
                self._buf.extend(self._preroll)
                self._preroll.clear()
            self._buf.append(frame)
            self._since_interim += FRAME
            if speaking:
                self._speech += FRAME
                self._quiet = 0
            else:
                self._quiet += FRAME
            if self._quiet >= self.silence_to_end * SAMPLE_RATE or self._length >= self.max_utterance * SAMPLE_RATE:
                job = self._cut()
                if job:
                    jobs.append(job)
            elif want_interim and self._since_interim >= self.interim_every * SAMPLE_RATE and self._speech >= SAMPLE_RATE:
                self._since_interim = 0
                jobs.append(Job(np.concatenate(self._buf), final=False))
        return jobs

    def flush(self) -> Job | None:
        """End of stream: whatever is buffered becomes a final utterance."""
        return self._cut()

    def _cut(self) -> Job | None:
        enough = self._speech >= self.min_utterance * SAMPLE_RATE
        audio = np.concatenate(self._buf) if self._buf else None
        self._buf, self._speech, self._quiet, self._since_interim = [], 0, 0, 0
        return Job(audio, final=True) if enough and audio is not None else None
