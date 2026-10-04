"use client";

import Link from "next/link";
import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import { EditableList, rowId, type Row } from "@/components/EditableList";
import { Arrow, Icon } from "@/components/Icon";
import type { CaptionEvent, ServerEvent, SpokenLine } from "@/lib/ai";
import { detect, segments } from "@/lib/captions";
import { KEYS, store, useHydrated, useStored } from "@/lib/store";
import { NoRoom } from "@/components/NoRoom";
import { delay } from "@/lib/ui";
import { useRoomSocket } from "@/lib/useRoomSocket";
import { DEFAULT_PREFS, type Prefs } from "./types";
import { micErrorMessage, useMic } from "./useMic";
import s from "./room.module.css";

type Line = { id: string; kind: "speech" | "typed"; text: string; speaker: string; mine: boolean };
type Stream = { history: Line[]; current: Line | null; interim: { text: string; speaker: string; mine: boolean } | null };
type Action =
  | { type: "interim"; text: string; speaker: string; mine: boolean }
  | { type: "clearInterim" }
  | { type: "final"; line: Line }
  | { type: "history"; lines: Line[] };

/** The big caption slot shows the newest line; the three before it fade above. */
function streamReducer(state: Stream, action: Action): Stream {
  const archive = (h: Line[], l: Line | null) => (l ? [...h, l].slice(-3) : h);
  switch (action.type) {
    case "interim":
      return { history: archive(state.history, state.current), current: null, interim: action };
    case "clearInterim":
      return { ...state, interim: null };
    case "final":
      if (state.current?.id === action.line.id || state.history.some((l) => l.id === action.line.id)) return state;
      return { history: archive(state.history, state.current), current: action.line, interim: null };
    case "history": {
      const lines = action.lines.slice(-4);
      return { history: lines.slice(0, -1), current: lines.at(-1) ?? null, interim: null };
    }
  }
}

function parse<T>(raw: string, fallback: T): T {
  try {
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function Marked({ text }: { text: string }) {
  return (
    <>
      {segments(text).map((seg, i) => (seg.mark ? <mark key={i}>{seg.text}</mark> : <span key={i}>{seg.text}</span>))}
    </>
  );
}

/** Who said it: nothing for your own speech, a name for others, and a chip for typed replies. */
function Who({ line }: { line: Pick<Line, "kind" | "speaker" | "mine"> }) {
  if (line.kind === "typed") return <span className={s.who}>{line.mine ? "You · typed" : `${line.speaker} · typed`}</span>;
  if (!line.mine) return <span className={`${s.who} ${s.whoOther}`}>{line.speaker}</span>;
  return null;
}

/** "Kofi", "Kofi and Efua", "Kofi, Efua and Yaw" — unnamed people read as "your teammate". */
function listNames(names: string[]) {
  const shown = names.map((n) => (n === "Participant" ? "your teammate" : n));
  return shown.length < 2 ? shown.join("") : `${shown.slice(0, -1).join(", ")} and ${shown.at(-1)}`;
}

const OFFLINE = "The m’aso service isn’t reachable, so live captions can’t start. Check that it’s running, then try again.";

export function Room() {
  const code = useStored(KEYS.room, "");
  const hydrated = useHydrated();
  const name = useStored(KEYS.name, "") || "Participant";

  const prefsRaw = useStored(KEYS.prefs, "");
  const prefs = useMemo<Prefs>(() => ({ ...DEFAULT_PREFS, ...parse<Partial<Prefs>>(prefsRaw, {}) }), [prefsRaw]);
  const setPref = (p: Partial<Prefs>) => store.setJson(KEYS.prefs, { ...prefs, ...p });

  const detailsRaw = useStored(KEYS.details, "");
  const details = useMemo(() => parse<Row[]>(detailsRaw, []), [detailsRaw]);

  const [listening, setListening] = useState(false);
  const [error, setError] = useState("");
  const [participants, setParticipants] = useState(1);
  const [names, setNames] = useState<string[]>([]);
  const [stream, dispatch] = useReducer(streamReducer, { history: [], current: null, interim: null });
  const [announce, setAnnounce] = useState("");
  const [notice, setNotice] = useState("");
  const [reply, setReply] = useState("");
  const mySid = useRef<number | null>(null);

  /** Every finished line, from anyone, is scanned for dates, times and follow-ups. */
  function recordLine(line: Line) {
    dispatch({ type: "final", line });
    setAnnounce(line.kind === "typed" ? `${line.mine ? "You" : line.speaker} typed: ${line.text}` : line.text);
    if (line.kind === "typed" && line.mine) store.set(KEYS.reply, line.text);
    // A local copy of the conversation, so a summary still works if the service restarts mid-conversation.
    const transcript = store.json<SpokenLine[]>(KEYS.transcript, []);
    store.setJson(KEYS.transcript, [...transcript, { speaker: line.mine ? name : line.speaker, kind: line.kind, text: line.text }].slice(-2000));
    // Read the latest saved list, not the render-time copy: lines can land between renders.
    const saved = store.json<Row[]>(KEYS.details, []);
    const fresh = detect(line.text).filter((d) => !saved.some((r) => r.label.toLowerCase() === d.label.toLowerCase()));
    if (fresh.length) store.setJson(KEYS.details, [...saved, ...fresh.map((d) => ({ ...d, id: rowId() }))]);
  }

  const toLine = (e: CaptionEvent): Line => ({ id: `s${e.id}`, kind: e.kind, text: e.text, speaker: e.speaker, mine: e.sid === mySid.current });

  const socket = useRoomSocket(code, name, (e: ServerEvent) => {
    if (e.type === "welcome") mySid.current = e.sid;
    else if (e.type === "presence") {
      setParticipants(e.participants);
      setNames(e.names);
    }
    else if (e.type === "history") dispatch({ type: "history", lines: e.lines.map(toLine) });
    else if (e.type === "error") {
      setError(e.message);
      setListening(false);
    } else if (e.type === "caption") {
      if (e.final) recordLine(toLine(e));
      else if (e.text) dispatch({ type: "interim", text: e.text, speaker: e.speaker, mine: e.sid === mySid.current });
      else dispatch({ type: "clearInterim" });
    }
  });
  const online = socket.status === "open";

  // Our microphone goes to faster-whisper; captions come back to everyone in the room.
  const live = listening && online;
  const { send } = socket; // stable; the socket object itself changes every render
  useEffect(() => {
    if (!live) return;
    send({ type: "audio_start", interim: prefs.pace === "instant" });
    return () => {
      send({ type: "audio_stop" });
    };
  }, [live, prefs.pace, send]);
  useMic(live, socket.sendAudio, (err) => {
    setError(micErrorMessage(err));
    setListening(false);
  });

  function toggleListening() {
    setError("");
    if (listening) return setListening(false);
    if (!online) return setError(OFFLINE);
    setListening(true);
  }

  // Display pop-over closes on Escape or a click outside it.
  const displayRef = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const el = displayRef.current;
    if (!el) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && el.open) {
        el.open = false;
        el.querySelector("summary")?.focus();
      }
    };
    const onClick = (e: MouseEvent) => {
      if (el.open && !el.contains(e.target as Node)) el.open = false;
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("click", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("click", onClick);
    };
  }, []);

  function sendReply(e: React.FormEvent) {
    e.preventDefault();
    const text = reply.trim();
    if (!text) {
      document.getElementById("replyInput")?.focus();
      return;
    }
    // The room echoes the message back to everyone, us included, and that echo is what we show.
    if (!socket.send({ type: "reply", text })) {
      setNotice("Not sent: the m’aso service isn’t reachable. Your message is still in the box.");
      return;
    }
    setNotice("Sent to everyone in the room.");
    setReply("");
  }

  if (hydrated && !code) return <NoRoom />;

  const { history, current, interim } = stream;
  // Everyone in the room except us (one copy of our own name is ours).
  const others = [...names];
  const me = others.indexOf(name);
  if (me >= 0) others.splice(me, 1);
  const idle = interim === null && current === null;
  const stateLabel = listening ? "Listening" : online ? `${participants} in room` : "Connecting…";
  const sourceNote = online
    ? "Everyone in the room sees these captions. m’aso’s own speech model (faster-whisper) transcribes the microphone; audio is never stored or sent to anyone else."
    : "Connecting to the m’aso service… Captions and replies start as soon as it’s reachable.";

  return (
    <>
      <header className={`${s.roomhead} rise`}>
        <div>
          <div className="eyebrow">Room {code}</div>
          <h1 className={s.roomtitle}>{others.length ? `Talking with ${listNames(others)}` : "Waiting for your teammate"}</h1>
        </div>
        <div className={s.headactions}>
          <span className={`live on-light ${listening ? "pulse" : "idle"}`} id="headLive">
            {listening ? "Captions on" : "Captions paused"}
          </span>
          <Link className="btn primary" href="/summary">
            End conversation <Arrow />
          </Link>
        </div>
      </header>

      <div className={s.roomgrid}>
        <section
          className={`panel-dark rise ${s.livecard} ${prefs.contrast ? s.hc : ""}`}
          style={delay(0.1)}
          data-size={prefs.size}
          id="livecard"
          aria-label="Captions"
        >
          <div className={s.roomtop}>
            <span className="tag" id="modeTag">
              Live · faster-whisper
            </span>
            <div className={s.topright}>
              <span className={`live ${listening ? "pulse" : "idle"}`} id="liveState">
                {stateLabel}
              </span>
              <details className={s.display} ref={displayRef} id="display">
                <summary>
                  <Icon name="sliders" />
                  <span>Display</span>
                </summary>
                <div className={s.displaypanel}>
                  <fieldset className="setting">
                    <legend>Text size</legend>
                    <div className="segmented">
                      {(["s", "m", "l", "xl"] as const).map((v) => (
                        <label key={v}>
                          <input type="radio" name="size" value={v} checked={prefs.size === v} onChange={() => setPref({ size: v })} />
                          <span>{v.toUpperCase()}</span>
                        </label>
                      ))}
                    </div>
                  </fieldset>
                  <fieldset className="setting">
                    <legend>Caption pace</legend>
                    <div className="segmented">
                      {(
                        [
                          ["instant", "Word by word"],
                          ["steady", "Full phrases"],
                        ] as const
                      ).map(([v, label]) => (
                        <label key={v}>
                          <input type="radio" name="pace" value={v} checked={prefs.pace === v} onChange={() => setPref({ pace: v })} />
                          <span>{label}</span>
                        </label>
                      ))}
                    </div>
                  </fieldset>
                  <div className="setting switchrow">
                    <span className="label" id="hcLabel">
                      High contrast
                    </span>
                    <button
                      className="switch"
                      id="hcSwitch"
                      type="button"
                      role="switch"
                      aria-checked={prefs.contrast}
                      aria-labelledby="hcLabel"
                      onClick={() => setPref({ contrast: !prefs.contrast })}
                    >
                      <span />
                    </button>
                  </div>
                </div>
              </details>
            </div>
          </div>

          <div className={s.stream}>
            <ol className={s.history} aria-label="Earlier lines">
              {history.map((l) => (
                <li key={l.id}>
                  <Who line={l} />
                  {l.kind === "typed" ? l.text : <Marked text={l.text} />}
                </li>
              ))}
            </ol>
            <p className={`${s.caption} ${idle ? s.idle : ""} ${current?.kind === "typed" && !interim ? s.typed : ""}`} id="caption">
              {interim ? (
                <>
                  <Who line={{ kind: "speech", speaker: interim.speaker, mine: interim.mine }} />
                  <span className={s.interim}>{interim.text}</span>
                </>
              ) : current ? (
                <>
                  <Who line={current} />
                  {current.kind === "typed" ? current.text : <Marked text={current.text} />}
                </>
              ) : (
                "Captions will appear here once you start listening."
              )}
            </p>
          </div>
          <p className="sr" aria-live="polite" id="srLive">
            {announce}
          </p>

          <div className={s.capcontrols}>
            <button className={s.listen} id="listenBtn" type="button" aria-pressed={listening} onClick={toggleListening}>
              <Icon name="mic" />
              <span>{listening ? "Stop listening" : "Start listening"}</span>
            </button>
          </div>
          <p className={s.source} id="sourceNote">
            {sourceNote}
          </p>
          {error && (
            <p className={s.capError} role="alert" id="errorNote">
              {error}
            </p>
          )}

          <form className={s.reply} onSubmit={sendReply}>
            <label className="sr" htmlFor="replyInput">
              Type a message
            </label>
            <input
              id="replyInput"
              placeholder="Type a message for everyone to see…"
              autoComplete="off"
              value={reply}
              onChange={(e) => setReply(e.target.value)}
            />
            <button className="btn primary sm" type="submit">
              Send
            </button>
          </form>
          <p className={s.replynotice} role="status" id="replyNotice">
            {notice}
          </p>
        </section>

        <aside className={s.side}>
          <section className={`card accent static rise ${s.kdcard}`} style={delay(0.2)} aria-labelledby="kdTitle">
            <h2 className={s.sidetitle} id="kdTitle">
              Key details
            </h2>
            <p className={s.sidehint}>Picked out automatically. Edit or remove anything that’s wrong.</p>
            <EditableList
              items={details}
              onChange={(next) => store.setJson(KEYS.details, next)}
              field="label"
              fieldName="Key detail"
              rowClassName="item"
              listClassName="itemlist"
              emptyText="Dates, times and follow-ups appear here as they are said."
              render={(row) => (
                <>
                  <span className={`dot ${row.tone ?? ""}`} />
                  <div>
                    <b>{row.label}</b>
                    <span>{row.text}</span>
                    {row.edited && <em className="flag">Edited</em>}
                  </div>
                </>
              )}
            />
          </section>
        </aside>
      </div>
    </>
  );
}
