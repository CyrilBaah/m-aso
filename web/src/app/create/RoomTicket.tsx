"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/Icon";
import { createRoom } from "@/lib/ai";
import { KEYS, resetSession, store } from "@/lib/store";

/** Opens a fresh room on the AI service and shows its code and share link. */
export function RoomTicket({ shareClassName, linkClassName }: { shareClassName: string; linkClassName: string }) {
  const [code, setCode] = useState<string | null>(null);
  const [copy, setCopy] = useState<"idle" | "copied" | "failed">("idle");

  useEffect(() => {
    let cancelled = false;
    resetSession();
    createRoom().then((c) => {
      if (cancelled) return;
      store.set(KEYS.room, c);
      setCode(c);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (copy === "idle") return;
    const t = setTimeout(() => setCopy("idle"), 1600);
    return () => clearTimeout(t);
  }, [copy]);

  const link = code ? `${location.origin}/join?code=${code}` : "";

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(link);
      setCopy("copied");
    } catch {
      setCopy("failed");
    }
  }

  return (
    <>
      <div className="roomcode" aria-label="Room code" aria-busy={!code}>
        {code ?? "····-···"}
      </div>
      <p className={shareClassName}>
        Share link · <span className={linkClassName}>{code ? link.replace(/^https?:\/\//, "") : "Opening a room…"}</span>
        <button className="btn ghost sm" type="button" onClick={copyLink} disabled={!code}>
          <Icon name="copy" />
          <span>{copy === "copied" ? "Copied" : copy === "failed" ? "Copy failed" : "Copy link"}</span>
        </button>
        <span className="sr" role="status">
          {copy === "copied" ? "Link copied" : copy === "failed" ? "Could not copy, select the link instead" : ""}
        </span>
      </p>
    </>
  );
}
