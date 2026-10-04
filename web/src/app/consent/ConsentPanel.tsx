"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { Arrow } from "@/components/Icon";
import type { Person } from "@/lib/ai";
import { listNames } from "@/lib/names";
import { KEYS, useHydrated, useStored } from "@/lib/store";
import { delay } from "@/lib/ui";
import { useRoomSocket } from "@/lib/useRoomSocket";
import { NameField } from "./NameField";
import s from "./consent.module.css";

/** Live presence and real consent: "I agree" is recorded by the room, and captions wait for everyone. */
export function ConsentPanel({ promises }: { promises: ReactNode }) {
  const router = useRouter();
  const code = useStored(KEYS.room, "");
  const myName = useStored(KEYS.name, "").trim();
  const hydrated = useHydrated();
  const [people, setPeople] = useState<Person[]>([]);
  const [error, setError] = useState("");
  const [mySid, setMySid] = useState<number | null>(null);
  const socket = useRoomSocket(code, myName || "Participant", (e) => {
    if (e.type === "welcome") setMySid(e.sid);
    if (e.type === "presence") setPeople(e.people);
  });

  const online = socket.status === "open";
  const others = people.filter((p) => p.sid !== mySid);
  const together = others.length > 0;
  const everyoneAgreed = together && others.every((p) => p.agreed);

  function agree() {
    if (!socket.send({ type: "consent" })) {
      setError("The m’aso service isn’t reachable, so your agreement couldn’t be recorded. Check that it’s running, then try again.");
      return;
    }
    router.push("/room");
  }

  if (hydrated && !code)
    return (
      <section className={`${s.panel} rise`} style={delay(0.24)}>
        <article className={`panel-dark ${s.status}`}>
          <span className="live idle">No room</span>
          <h2>You’re not in a room yet.</h2>
          <p className="body">Go back and start a room, or join one with your teammate’s code.</p>
        </article>
      </section>
    );

  return (
    <section className={`${s.panel} rise`} style={delay(0.24)}>
      <article className={`panel-dark ${s.status}`}>
        <span className={`live ${online ? "" : "idle"}`}>{online ? `Room ${code} open` : "Connecting…"}</span>
        <h2>{everyoneAgreed ? "Your teammate is ready." : together ? "You’re both here." : "Waiting for your teammate."}</h2>
        <p className="body">
          {together ? (
            everyoneAgreed ? (
              <>{listNames(others.map((p) => p.name))} agreed. Agree too, and captions can begin.</>
            ) : (
              <>
                You’re in room <strong className={s.code}>{code}</strong> together. Captions start once you’ve both agreed.
              </>
            )
          ) : (
            <>
              Share code <strong className={s.code}>{code || "…"}</strong> with your teammate. You can agree now; captions
              wait until they join and agree too.
            </>
          )}
        </p>
        <NameField className={s.name} />
        <ul className="chips" aria-label="In the room">
          <li className="chip">
            <i />
            You
          </li>
          {others.map((p) => (
            <li className={`chip ${p.agreed ? "" : s.pending}`} key={p.sid}>
              <i />
              {p.name === "Participant" ? "Your teammate" : p.name} · {p.agreed ? "agreed" : "not yet"}
            </li>
          ))}
        </ul>
      </article>
      <article className="card">
        <h2 className="cardtitle">Before you start.</h2>
        <p className="body">Everyone in the room sees the same captions, and anyone can type.</p>
        {promises}
        {error && (
          <p className={s.error} role="alert">
            {error}
          </p>
        )}
        <div className="actions">
          <button className="btn primary" type="button" onClick={agree}>
            I agree, start captions <Arrow />
          </button>
          <Link className="btn ghost" href="/start">
            Not now
          </Link>
        </div>
      </article>
    </section>
  );
}
