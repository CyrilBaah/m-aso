"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Arrow, Icon } from "@/components/Icon";
import { createRoom } from "@/lib/ai";
import { KEYS, resetSession, store, useStored } from "@/lib/store";
import { delay } from "@/lib/ui";
import { useRoomSocket } from "@/lib/useRoomSocket";
import s from "./create.module.css";

/** Opens a room on the service, shares its code and shows when the colleague arrives. */
export function CreateRoom() {
  const [code, setCode] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [copy, setCopy] = useState<"idle" | "copied" | "failed">("idle");
  const [present, setPresent] = useState(1);
  const name = useStored(KEYS.name, "") || "Participant";

  useEffect(() => {
    let cancelled = false;
    resetSession();
    createRoom()
      .then((c) => {
        if (cancelled) return;
        store.set(KEYS.room, c);
        setCode(c);
      })
      .catch((err: Error) => !cancelled && setError(err.message));
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  // Holding the room open lets us see the moment the colleague joins.
  const socket = useRoomSocket(code ?? "", name, (e) => {
    if (e.type === "presence") setPresent(e.participants);
  });

  useEffect(() => {
    if (copy === "idle") return;
    const t = setTimeout(() => setCopy("idle"), 1600);
    return () => clearTimeout(t);
  }, [copy]);

  const link = code ? `${location.origin}/join?code=${code}` : "";
  const joined = present >= 2;

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(link);
      setCopy("copied");
    } catch {
      setCopy("failed");
    }
  }

  if (error)
    return (
      <section className={`card ${s.waiting}`} role="alert">
        <h2 className="cardtitle">The room couldn’t be opened.</h2>
        <p className="body">{error}</p>
        <div className="actions">
          <button
            className="btn primary"
            type="button"
            onClick={() => {
              setError("");
              setAttempt((n) => n + 1);
            }}
          >
            Try again <Arrow />
          </button>
          <Link className="btn ghost" href="/start">
            Cancel
          </Link>
        </div>
      </section>
    );

  return (
    <>
      <div className="rise" style={delay(0.24)}>
        <div className="roomcode" aria-label="Room code" aria-busy={!code}>
          {code ?? "····-···"}
        </div>
        <p className={s.share}>
          Share link · <span className={s.link}>{code ? link.replace(/^https?:\/\//, "") : "Opening a room…"}</span>
          <button className="btn ghost sm" type="button" onClick={copyLink} disabled={!code}>
            <Icon name="copy" />
            <span>{copy === "copied" ? "Copied" : copy === "failed" ? "Copy failed" : "Copy link"}</span>
          </button>
          <span className="sr" role="status">
            {copy === "copied" ? "Link copied" : copy === "failed" ? "Could not copy, select the link instead" : ""}
          </span>
        </p>
      </div>
      <section className={`card accent static rise ${s.waiting}`} style={delay(0.32)}>
        <ul className="itemlist">
          <li className={`item ${joined ? s.joined : ""}`} role="status">
            <span className={`dot ${joined ? "" : "is-yellow"}`} />
            <div>
              <b>{joined ? "Your colleague has joined" : socket.status === "open" ? "Waiting for your colleague" : "Opening the room…"}</b>
              <span>{joined ? "You can both continue to consent." : "They can join with the code or link above."}</span>
            </div>
          </li>
        </ul>
        <div className="actions">
          <Link className="btn primary" href="/consent" aria-disabled={!code || undefined} tabIndex={code ? undefined : -1}>
            Continue to consent <Arrow />
          </Link>
          <Link className="btn ghost" href="/start">
            Cancel
          </Link>
        </div>
      </section>
    </>
  );
}
