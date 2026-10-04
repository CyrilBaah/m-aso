"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { EditableList, rowId, type Row } from "@/components/EditableList";
import { Arrow, Icon } from "@/components/Icon";
import { deleteRoom, summarise, type SpokenLine, type Summary } from "@/lib/ai";
import { KEYS, resetSession, store, useStored } from "@/lib/store";
import s from "./summary.module.css";

type SummaryRow = Row & { source?: "gemma" };
type Status = { state: "idle" | "reading" | "ready" } | { state: "failed"; message: string };

function parse<T>(raw: string, fallback: T): T {
  try {
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

/** Gemma's JSON as editable rows. Owners and due dates stay attached to their task. */
function rowsFrom(summary: Summary): SummaryRow[] {
  const row = (label: string, text: string): SummaryRow => ({ id: rowId(), label, text, source: "gemma" });
  return [
    ...summary.decisions.map((d) => row("Decision", d)),
    ...summary.action_items.map((a) =>
      row("Action item", [a.task, [a.owner, a.due].filter(Boolean).join(", ")].filter(Boolean).join(" — ")),
    ),
    ...summary.key_dates.map((d) => row("Date or time", d)),
    ...summary.open_questions.map((q) => row("Open question", q)),
  ];
}

/** Without Gemma: only what the room itself picked up during the conversation. */
function capturedRows(details: Row[], reply: string): SummaryRow[] {
  return [
    ...details.map((d) => ({ id: `d-${d.id}`, label: d.tone === "is-blue" ? "Follow-up" : "Date or time", text: d.label })),
    ...(reply ? [{ id: "reply", label: "Your last reply", text: reply }] : []),
  ];
}

export function SummaryCard() {
  const savedRaw = useStored(KEYS.summary, "");
  const detailsRaw = useStored(KEYS.details, "");
  const reply = useStored(KEYS.reply, "");
  const [status, setStatus] = useState<Status>({ state: "idle" });
  const [attempt, setAttempt] = useState(0);

  // Ask Gemma once per conversation; afterwards the person's edited rows are the summary.
  useEffect(() => {
    if (store.get(KEYS.summary)) return;
    const lines = store.json<SpokenLine[]>(KEYS.transcript, []);
    const controller = new AbortController();
    summarise(store.get(KEYS.room) ?? "", lines, controller.signal)
      .then((summary) => {
        const rows = rowsFrom(summary);
        store.setJson(KEYS.summary, rows.length ? rows : []);
        setStatus({ state: "ready" });
      })
      .catch((err: Error) => {
        if (!controller.signal.aborted) setStatus({ state: "failed", message: err.message });
      });
    return () => controller.abort();
  }, [attempt]);

  const saved = parse<SummaryRow[] | null>(savedRaw, null);
  const items = useMemo<SummaryRow[]>(
    () => saved ?? (status.state === "failed" ? capturedRows(parse<Row[]>(detailsRaw, []), reply) : []),
    [saved, status.state, detailsRaw, reply],
  );
  const reading = !saved && (status.state === "reading" || status.state === "idle");
  const fromGemma = items.some((r) => r.source === "gemma");

  return (
    <article className={`card ${s.card}`} aria-labelledby="sumTitle" aria-busy={reading}>
      <h2 className="cardtitle" id="sumTitle">
        Conversation summary
      </h2>
      {reading ? (
        <p className={`body ${s.intro}`} role="status">
          <span className={s.spinner} aria-hidden="true" />
          Gemma is reading the conversation…
        </p>
      ) : status.state === "failed" && !fromGemma ? (
        <div className={s.failed} role="alert">
          <p>
            <b>No AI summary this time.</b> {status.message}
          </p>
          <p>
            Below is what the room picked up while you talked.{" "}
            <button
              type="button"
              className="linkbtn"
              onClick={() => {
                store.del(KEYS.summary);
                setStatus({ state: "reading" });
                setAttempt((n) => n + 1);
              }}
            >
              Try Gemma again
            </button>
          </p>
        </div>
      ) : (
        <p className={`body ${s.intro}`}>
          {fromGemma ? (
            <>
              Written by <span className="tag light is-ai">Gemma</span> from this conversation. AI can be wrong: fix or
              remove anything before you save.
            </>
          ) : (
            <>Fix or remove anything before you save.</>
          )}
        </p>
      )}

      {!reading && (
        <EditableList
          items={items}
          onChange={(next) => store.setJson(KEYS.summary, next)}
          rowClassName="summaryrow"
          listClassName={`summary ${s.list}`}
          emptyText={
            status.state === "failed" && !saved
              ? "Nothing was captured in this conversation."
              : "Nothing to record. Delete the session, or save it empty."
          }
          render={(row) => (
            <>
              <b>
                {row.label}
                {row.edited && <span className="tag light is-edited">Edited</span>}
              </b>
              <span>{row.text}</span>
            </>
          )}
        />
      )}

      <div className="actions">
        <Link className="btn primary" href="/complete?status=saved" aria-disabled={reading || undefined}>
          Save summary <Arrow />
        </Link>
        <Link
          className="btn ghost"
          href="/complete?status=deleted"
          id="deleteBtn"
          onClick={() => {
            deleteRoom(store.get(KEYS.room) ?? "");
            resetSession();
          }}
        >
          <Icon name="trash" />
          Delete session
        </Link>
      </div>
    </article>
  );
}
