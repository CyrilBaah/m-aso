"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Arrow } from "@/components/Icon";
import { KEYS, resetSession, store } from "@/lib/store";
import { delay } from "@/lib/ui";
import s from "./join.module.css";

const HINT = "Room codes are four letters and three numbers, shared privately by your colleague.";

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
  const found = isValid(code);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!found) {
      setError(true);
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
        aria-invalid={(error && !found) || undefined}
        value={code}
        onChange={(e) => {
          setCode(formatCode(e.target.value));
          setError(false);
        }}
      />
      <p className={`${s.hint} ${error && !found ? s.error : ""}`} id="codeHint">
        {error && !found ? "That code doesn’t look right. Use four letters and three numbers, like WORK-482." : HINT}
      </p>
      <section className={`card accent static is-blue ${s.status}`}>
        <ul className="itemlist">
          <li className={`item ${found ? s.found : ""}`} id="joinStatus">
            <span className="dot is-blue" />
            <div>
              <b>{found ? "Room found" : "Waiting for a code"}</b>
              <span>{found ? "You are ready to join the private conversation." : "Type the code to find the room."}</span>
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
