"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { WS_URL, type ServerEvent } from "@/lib/ai";

export type SocketStatus = "connecting" | "open" | "offline";

/** One WebSocket per room: presence, captions and replies from everyone, plus our own audio going up.
    The name is sent on connect and kept up to date with `rename`, so typing a name never reconnects. */
export function useRoomSocket(code: string, name: string, onEvent: (e: ServerEvent) => void) {
  const [status, setStatus] = useState<SocketStatus>("connecting");
  const ws = useRef<WebSocket | null>(null);
  const handler = useRef(onEvent);
  const nameRef = useRef(name);
  useEffect(() => {
    handler.current = onEvent;
  });

  useEffect(() => {
    if (!code) return;
    let closed = false;
    let retry = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const connect = () => {
      const socket = new WebSocket(`${WS_URL}/rooms/${encodeURIComponent(code)}/ws?name=${encodeURIComponent(nameRef.current)}`);
      socket.binaryType = "arraybuffer";
      ws.current = socket;
      socket.onopen = () => {
        retry = 0;
        setStatus("open");
      };
      socket.onmessage = (e) => {
        try {
          handler.current(JSON.parse(e.data as string) as ServerEvent);
        } catch {}
      };
      socket.onclose = () => {
        if (ws.current === socket) ws.current = null;
        if (closed) return;
        setStatus("offline");
        timer = setTimeout(connect, Math.min(1000 * 2 ** retry++, 10_000)); // back off, keep trying
      };
    };
    connect();
    return () => {
      closed = true;
      clearTimeout(timer);
      ws.current?.close();
      ws.current = null;
    };
  }, [code]);

  useEffect(() => {
    nameRef.current = name;
    if (ws.current?.readyState === WebSocket.OPEN) ws.current.send(JSON.stringify({ type: "rename", name }));
  }, [name]);

  const send = useCallback((message: object) => {
    if (ws.current?.readyState !== WebSocket.OPEN) return false;
    ws.current.send(JSON.stringify(message));
    return true;
  }, []);

  const sendAudio = useCallback((chunk: ArrayBuffer) => {
    if (ws.current?.readyState === WebSocket.OPEN) ws.current.send(chunk);
  }, []);

  return { status, send, sendAudio };
}
