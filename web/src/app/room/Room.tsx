"use client";

import Link from "next/link";
import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import { EditableList, rowId, type Row } from "@/components/EditableList";
import { Arrow, Icon } from "@/components/Icon";
import { detect, segments } from "@/lib/captions";
import { KEYS, store, useStored } from "@/lib/store";
import { delay } from "@/lib/ui";
import { DEFAULT_PREFS, type CaptionHandlers, type Prefs } from "./types";
import { useDemoCaptions } from "./useDemoCaptions";
import s from "./room.module.css";

type Line = { id: number; kind: "speech" | "typed"; text: string };
type Stream = { history: Line[]; current: Line | null; interim: string | null };
type Action = { type: "interim"; text: string } | { type: "final"; line: Line };

/** The big caption slot shows the newest line; the three before it fade above. */
function streamReducer(state: Stream, action: Action): Stream {
  const archive = (h: Line[], l: Line | null) => (l ? [...h, l].slice(-3) : h);
  if (action.type === "interim")
    return { history: archive(state.history, state.current), current: null, interim: action.text };
  return { history: archive(state.history, state.current), current: action.line, interim: null };
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

let lineSeq = 0;

export function Room() {
  const prefsRaw = useStored(KEYS.prefs, "");
  const prefs = useMemo<Prefs>(() => ({ ...DEFAULT_PREFS, ...parse<Partial<Prefs>>(prefsRaw, {}) }), [prefsRaw]);
  const setPref = (p: Partial<Prefs>) => store.setJson(KEYS.prefs, { ...prefs, ...p });

  const detailsRaw = useStored(KEYS.details, "");
  const details = useMemo(() => parse<Row[]>(detailsRaw, []), [detailsRaw]);

  const [listening, setListening] = useState(false);
  const [stream, dispatch] = useReducer(streamReducer, { history: [], current: null, interim: null });
  const [announce, setAnnounce] = useState("");
  const [notice, setNotice] = useState("");
  const [reply, setReply] = useState("");

  const handlers: CaptionHandlers = {
    onInterim: (text) => dispatch({ type: "interim", text }),
    onFinal: (text) => {
      const line = text.trim();
      if (!line) return;
      dispatch({ type: "final", line: { id: ++lineSeq, kind: "speech", text: line } });
      setAnnounce(line);
      // Read the latest saved list, not the render-time copy: lines can land between renders.
      const saved = store.json<Row[]>(KEYS.details, []);
      const fresh = detect(line).filter((d) => !saved.some((r) => r.label.toLowerCase() === d.label.toLowerCase()));
      if (fresh.length) store.setJson(KEYS.details, [...saved, ...fresh.map((d) => ({ ...d, id: rowId() }))]);
    },
  };
  useDemoCaptions(listening, prefs.pace, handlers);

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
    dispatch({ type: "final", line: { id: ++lineSeq, kind: "typed", text } });
    setAnnounce(`Typed reply: ${text}`);
    setNotice("Sent to everyone in the room.");
    store.set(KEYS.reply, text);
    setReply("");
  }

  const { history, current, interim } = stream;
  const idle = interim === null && current === null;

  return (
    <>
      <header className={`${s.roomhead} rise`}>
        <div>
          <div className="eyebrow">Active conversation</div>
          <h1 className={s.roomtitle}>A clearer way to stay in the conversation.</h1>
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
            <span className="tag is-demo" id="modeTag">
              Demo captions · simulated
            </span>
            <div className={s.topright}>
              <span className={`live ${listening ? "pulse" : "idle"}`} id="liveState">
                {listening ? "Playing demo" : "Paused"}
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
                <li key={l.id} className={l.kind === "typed" ? s.typed : ""}>
                  {l.kind === "typed" ? (
                    <>
                      <span className={s.who}>Typed reply</span>
                      {l.text}
                    </>
                  ) : (
                    <Marked text={l.text} />
                  )}
                </li>
              ))}
            </ol>
            <p className={`${s.caption} ${idle ? s.idle : ""} ${current?.kind === "typed" ? s.typed : ""}`} id="caption">
              {interim !== null ? (
                <span className={s.interim}>{interim}</span>
              ) : current?.kind === "typed" ? (
                <>
                  <span className={s.who}>Typed reply</span>
                  {current.text}
                </>
              ) : current ? (
                <Marked text={current.text} />
              ) : (
                "Captions will appear here once you start listening."
              )}
            </p>
          </div>
          <p className="sr" aria-live="polite" id="srLive">
            {announce}
          </p>

          <div className={s.capcontrols}>
            <button className={s.listen} id="listenBtn" type="button" aria-pressed={listening} onClick={() => setListening((v) => !v)}>
              <Icon name="mic" />
              <span>{listening ? "Stop listening" : "Play demo captions"}</span>
            </button>
          </div>
          <p className={s.source} id="sourceNote">
            Everyone in the room sees these captions. Sample lines play instead of your microphone.
          </p>

          <form className={s.reply} onSubmit={sendReply}>
            <label className="sr" htmlFor="replyInput">
              Type a reply
            </label>
            <input
              id="replyInput"
              placeholder="Type a reply for everyone to see…"
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
