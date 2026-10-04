"use client";

import { useState } from "react";
import { KEYS, useHydrated, useStored } from "@/lib/store";
import { useRoomSocket } from "@/lib/useRoomSocket";
import { NameField } from "./NameField";
import s from "./consent.module.css";

/** Who is actually in the room right now, live from the service. */
export function RoomPresence() {
  const code = useStored(KEYS.room, "");
  const myName = useStored(KEYS.name, "").trim();
  const hydrated = useHydrated();
  const [names, setNames] = useState<string[]>([]);
  const socket = useRoomSocket(code, myName || "Participant", (e) => {
    if (e.type === "presence") setNames(e.names);
  });

  const online = socket.status === "open";
  const together = names.length >= 2;
  // Label ourselves "You": drop one copy of our own name from the list the server sent.
  const others = [...names];
  const mine = others.indexOf(myName || "Participant");
  if (mine >= 0) others.splice(mine, 1);

  if (hydrated && !code)
    return (
      <article className={`panel-dark ${s.status}`}>
        <span className="live idle">No room</span>
        <h2>You’re not in a room yet.</h2>
        <p className="body">Go back and start a room, or join one with your colleague’s code.</p>
      </article>
    );

  return (
    <article className={`panel-dark ${s.status}`}>
      <span className={`live ${online ? "" : "idle"}`}>{online ? `Room ${code} open` : "Connecting…"}</span>
      <h2>{together ? "You’re both here." : "Waiting for your colleague."}</h2>
      <p className="body">
        {together ? (
          <>
            You’re in private room <strong className={s.code}>{code}</strong> together. Take a moment, then begin.
          </>
        ) : (
          <>
            Share code <strong className={s.code}>{code || "…"}</strong> with your colleague. You can carry on; they’ll
            appear here when they join.
          </>
        )}
      </p>
      <NameField className={s.name} />
      <div className="chips" aria-label="In the room">
        <span className="chip">
          <i />
          You
        </span>
        {others.map((n, i) => (
          <span className="chip" key={`${n}-${i}`}>
            <i />
            {n === "Participant" ? "Your colleague" : n}
          </span>
        ))}
      </div>
    </article>
  );
}
