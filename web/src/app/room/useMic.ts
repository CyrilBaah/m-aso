"use client";

import { useEffect, useRef } from "react";

const TARGET_RATE = 16_000;
const CHUNK = TARGET_RATE / 10; // 100 ms per message

export function micErrorMessage(err: unknown): string {
  const name = err instanceof DOMException ? err.name : "";
  if (name === "NotAllowedError" || name === "SecurityError")
    return "Microphone access is blocked. Allow it from the address bar, or switch to demo captions.";
  if (name === "NotFoundError" || name === "OverconstrainedError") return "No microphone was found. Connect one, or switch to demo captions.";
  return "The microphone could not start. Try again, or switch to demo captions.";
}

/** While active, streams the microphone as 16 kHz mono int16 chunks. */
export function useMic(active: boolean, onChunk: (pcm: ArrayBuffer) => void, onError: (err: unknown) => void) {
  const chunkRef = useRef(onChunk);
  const errorRef = useRef(onError);
  useEffect(() => {
    chunkRef.current = onChunk;
    errorRef.current = onError;
  });

  useEffect(() => {
    if (!active) return;
    let stopped = false;
    let ctx: AudioContext | undefined;
    let stream: MediaStream | undefined;

    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        });
        if (stopped) return stream.getTracks().forEach((t) => t.stop());
        ctx = new AudioContext();
        await ctx.audioWorklet.addModule("/pcm-worklet.js");
        if (stopped) return;
        const source = ctx.createMediaStreamSource(stream);
        const capture = new AudioWorkletNode(ctx, "pcm-capture");
        const mute = ctx.createGain();
        mute.gain.value = 0; // keeps the graph pulling audio without playing it back
        source.connect(capture).connect(mute).connect(ctx.destination);

        const ratio = ctx.sampleRate / TARGET_RATE;
        let leftover = new Float32Array(0);
        let out = new Int16Array(CHUNK);
        let filled = 0;
        capture.port.onmessage = (e: MessageEvent<Float32Array>) => {
          const input = new Float32Array(leftover.length + e.data.length);
          input.set(leftover);
          input.set(e.data, leftover.length);
          const count = Math.floor(input.length / ratio);
          for (let i = 0; i < count; i++) {
            // Average each window: a cheap low-pass that avoids aliasing when downsampling.
            const start = Math.floor(i * ratio);
            const end = Math.max(start + 1, Math.floor((i + 1) * ratio));
            let sum = 0;
            for (let j = start; j < end; j++) sum += input[j];
            const v = Math.max(-1, Math.min(1, sum / (end - start)));
            out[filled++] = v < 0 ? v * 0x8000 : v * 0x7fff;
            if (filled === CHUNK) {
              chunkRef.current(out.buffer);
              out = new Int16Array(CHUNK);
              filled = 0;
            }
          }
          leftover = input.slice(Math.floor(count * ratio));
        };
      } catch (err) {
        if (!stopped) errorRef.current(err);
      }
    })();

    return () => {
      stopped = true;
      stream?.getTracks().forEach((t) => t.stop());
      ctx?.close().catch(() => {});
    };
  }, [active]);
}
