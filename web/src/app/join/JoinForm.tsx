"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Arrow } from "@/components/Icon";
import { findRoom, type RoomLookup } from "@/lib/ai";
import { KEYS, resetSession, store } from "@/lib/store";
import { delay } from "@/lib/ui";
import s from "./join.module.css";

const HINT = "Room codes are four letters and three numbers, shared privately by your teammate.";

/** WORK482 / work-482 / “work 482” → WORK-482 */
export function formatCode(raw: string) {
  const v = raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
  return v.length > 4 ? `${v.slice(0, 4)}-${v.slice(4, 7)}` : v;
}
const isValid = (v: string) => /^[A-Z]{4}-[0-9]{3}$/.test(v);

export function JoinForm({ initialCode }: { initialCode: string }) {
  const router = useRouter();
  const [code, setCode] = useState(formatCode(initialCode));
  const [error, setError] = useState(false);
  const [lookup, setLookup] = useState<{ code: string; result: RoomLookup } | null>(null);
  const valid = isValid(code);
  const result = lookup?.code === code ? lookup.result : null;
  const found = result?.state === "open";

  // Check the room really exists as soon as the code is complete.
  useEffect(() => {
    if (!isValid(code)) return;
    const controller = new AbortController();
    const t = setTimeout(() => {
      findRoom(code, controller.signal)
        .then((r) => setLookup({ code, result: r }))
        .catch(() => {});
    }, 250);
    return () => {
      clearTimeout(t);
      controller.abort();
    };
  }, [code]);

  const status = !valid
    ? { title: "Waiting for a code", text: "Type the code to find the room.", tone: "" }
    : !result
      ? { title: "Looking for the room…", text: "Checking with the m’aso service.", tone: "" }
      : result.state === "open"
        ? {
            title: "Room found",
            text:
              result.participants === 0
                ? "The room is open. You are ready to join."
                : `${result.participants === 1 ? "1 person is" : `${result.participants} people are`} already in the room.`,
            tone: s.found,
          }
        : result.state === "missing"
          ? { title: "No room with that code", text: "Check the code with your teammate. Rooms close when everyone leaves for two hours.", tone: s.missing }
          : { title: "Can’t reach the m’aso service", text: "Check that it’s running, then try again.", tone: s.missing };

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!found) {
      setError(!valid);
      document.getElementById("code")?.focus();
      return;
    }
    resetSession();
    store.set(KEYS.room, code);
    router.push("/consent");
  }

  return (
    <form onSubmit={submit} className="rise" style={delay(0.24)} noValidate>
      <label className="sr" htmlFor="code">
        Room code
      </label>
      <input
        className="roomcode"
        id="code"
        name="code"
        placeholder="WORK-482"
        maxLength={8}
        autoComplete="off"
        autoCapitalize="characters"
        spellCheck={false}
        aria-describedby="codeHint"
        aria-invalid={(error && !valid) || undefined}
        value={code}
        onChange={(e) => {
          setCode(formatCode(e.target.value));
          setError(false);
        }}
      />
      <p className={`${s.hint} ${error && !valid ? s.error : ""}`} id="codeHint">
        {error && !valid ? "That code doesn’t look right. Use four letters and three numbers, like WORK-482." : HINT}
      </p>
      <section className={`card accent static is-blue ${s.status}`}>
        <ul className="itemlist">
          <li className={`item ${status.tone}`} id="joinStatus" role="status">
            <span className="dot is-blue" />
            <div>
              <b>{status.title}</b>
              <span>{status.text}</span>
            </div>
          </li>
        </ul>
        <div className="actions">
          <button className="btn secondary" type="submit" id="joinBtn">
            Join room <Arrow />
          </button>
          <Link className="btn ghost" href="/start">
            Cancel
          </Link>
        </div>
      </section>
    </form>
  );
}
