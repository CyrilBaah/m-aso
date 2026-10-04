"use client";

import Link from "next/link";
import { useMemo } from "react";
import { EditableList, type Row } from "@/components/EditableList";
import { Arrow, Icon } from "@/components/Icon";
import { KEYS, resetSession, store, useStored } from "@/lib/store";
import s from "./summary.module.css";

const SAMPLE: Row[] = [
  { id: "decision", label: "Decision", text: "The client meeting is now Thursday at 2:00 PM.", demo: true },
  { id: "action", label: "Action item", text: "Send the meeting agenda before Thursday.", demo: true },
];

function parse<T>(raw: string, fallback: T): T {
  try {
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

/** Summary rows: saved edits if any, otherwise sample rows plus what the room captured. */
export function SummaryCard() {
  const savedRaw = useStored(KEYS.summary, "");
  const detailsRaw = useStored(KEYS.details, "");
  const reply = useStored(KEYS.reply, "");

  const items = useMemo<Row[]>(() => {
    const saved = parse<Row[] | null>(savedRaw, null);
    if (saved) return saved;
    const details = parse<Row[]>(detailsRaw, []);
    return [
      ...SAMPLE,
      ...details.map((d) => ({ id: `d-${d.id}`, label: d.tone === "is-blue" ? "Follow-up" : "Date or time", text: d.label })),
      reply
        ? { id: "reply", label: "Your reply", text: reply }
        : { id: "reply", label: "Your reply", text: "Please send me the agenda before then.", demo: true },
    ];
  }, [savedRaw, detailsRaw, reply]);

  return (
    <article className={`card ${s.card}`} aria-labelledby="sumTitle">
      <h2 className="cardtitle" id="sumTitle">
        Conversation summary
      </h2>
      <p className={`body ${s.intro}`}>
        Rows tagged <span className="tag light">Sample</span> are demo text, not from your conversation. Fix or remove
        anything before you save.
      </p>
      <EditableList
        items={items}
        onChange={(next) => store.setJson(KEYS.summary, next)}
        rowClassName="summaryrow"
        listClassName={`summary ${s.list}`}
        emptyText="Nothing left in this summary. Delete the session, or save it empty."
        render={(row) => (
          <>
            <b>
              {row.label}
              {row.edited ? (
                <span className="tag light is-edited">Edited</span>
              ) : row.demo ? (
                <span className="tag light">Sample</span>
              ) : null}
            </b>
            <span>{row.text}</span>
          </>
        )}
      />
      <div className="actions">
        <Link className="btn primary" href="/complete?status=saved">
          Save summary <Arrow />
        </Link>
        <Link className="btn ghost" href="/complete?status=deleted" onClick={() => resetSession()} id="deleteBtn">
          <Icon name="trash" />
          Delete session
        </Link>
      </div>
    </article>
  );
}
