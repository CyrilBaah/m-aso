"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Icon } from "@/components/Icon";

export type Row = {
  id: string;
  label: string;
  text: string;
  tone?: "" | "is-blue";
  edited?: boolean;
  /** Placeholder text that did not come from the conversation. */
  demo?: boolean;
};

type Props = {
  items: Row[];
  onChange: (items: Row[]) => void;
  /** Inner content of a row in its read state. */
  render: (row: Row) => ReactNode;
  /** Which property the person edits. */
  field?: "label" | "text";
  /** Label for the edit box; defaults to the row label. */
  fieldName?: string;
  rowClassName: string;
  listClassName?: string;
  emptyText: string;
};

/** AI output the person can correct or remove, with undo. Fully keyboard operable. */
export function EditableList({
  items,
  onChange,
  render,
  field = "text",
  fieldName,
  rowClassName,
  listClassName = "",
  emptyText,
}: Props) {
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [invalid, setInvalid] = useState(false);
  const [status, setStatus] = useState<{ msg: string; undo?: { row: Row; index: number } } | null>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const focusNext = useRef<{ id?: string; index?: number; act: "edit" | "remove" } | null>(null);

  // Return focus to a sensible control after edits and removals.
  useEffect(() => {
    const want = focusNext.current;
    if (!want || editing) return;
    focusNext.current = null;
    const rows = listRef.current?.querySelectorAll<HTMLLIElement>(":scope > li[data-id]");
    if (!rows?.length) return;
    const row = want.id
      ? listRef.current?.querySelector<HTMLLIElement>(`li[data-id="${want.id}"]`)
      : rows[Math.min(want.index ?? 0, rows.length - 1)];
    row?.querySelector<HTMLButtonElement>(`[data-act="${want.act}"]`)?.focus();
  }, [items, editing]);

  // Fade the bottom edge while there is more to scroll.
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const update = () => el.classList.toggle("has-more", el.scrollHeight - el.clientHeight - el.scrollTop > 4);
    update();
    el.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      el.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [items, editing]);

  function startEdit(row: Row) {
    setEditing(row.id);
    setDraft(row[field]);
    setInvalid(false);
  }
  function cancel(row: Row) {
    focusNext.current = { id: row.id, act: "edit" };
    setEditing(null);
  }
  function save(row: Row) {
    const value = draft.trim();
    if (!value) {
      setInvalid(true);
      return;
    }
    focusNext.current = { id: row.id, act: "edit" };
    onChange(items.map((r) => (r.id === row.id ? { ...r, [field]: value, edited: true } : r)));
    setEditing(null);
    setStatus({ msg: `${row.label} updated.` });
  }
  function remove(row: Row, index: number) {
    focusNext.current = { index, act: "remove" };
    onChange(items.filter((r) => r.id !== row.id));
    setStatus({ msg: `${row.label} removed.`, undo: { row, index } });
  }
  function undo() {
    if (!status?.undo) return;
    const next = items.slice();
    next.splice(status.undo.index, 0, status.undo.row);
    focusNext.current = { id: status.undo.row.id, act: "remove" };
    onChange(next);
    setStatus({ msg: "Restored." });
  }

  return (
    <>
      <ul className={listClassName} ref={listRef}>
        {items.length === 0 && <li className="emptyrow">{emptyText}</li>}
        {items.map((row, i) =>
          editing === row.id ? (
            <li key={row.id} data-id={row.id} className={`${rowClassName} editing`}>
              <form
                className="rowedit"
                onSubmit={(e) => {
                  e.preventDefault();
                  save(row);
                }}
              >
                <label htmlFor={`edit-${row.id}`}>{fieldName ?? row.label}</label>
                <textarea
                  id={`edit-${row.id}`}
                  rows={2}
                  value={draft}
                  aria-invalid={invalid || undefined}
                  autoFocus
                  onFocus={(e) => e.currentTarget.setSelectionRange(e.currentTarget.value.length, e.currentTarget.value.length)}
                  onChange={(e) => {
                    setDraft(e.target.value);
                    setInvalid(false);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") cancel(row);
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      save(row);
                    }
                  }}
                />
                <div className="rowedit-actions">
                  <button className="btn primary sm" type="submit">
                    Save
                  </button>
                  <button className="btn ghost sm" type="button" onClick={() => cancel(row)}>
                    Cancel
                  </button>
                </div>
              </form>
            </li>
          ) : (
            <li key={row.id} data-id={row.id} className={rowClassName}>
              <div className="rowbody">{render(row)}</div>
              <div className="rowtools">
                <button type="button" className="iconbtn" data-act="edit" aria-label={`Edit ${row.label}`} title="Edit" onClick={() => startEdit(row)}>
                  <Icon name="edit" />
                </button>
                <button type="button" className="iconbtn" data-act="remove" aria-label={`Remove ${row.label}`} title="Remove" onClick={() => remove(row, i)}>
                  <Icon name="close" />
                </button>
              </div>
            </li>
          ),
        )}
      </ul>
      <p className="rowstatus" role="status">
        {status?.msg}
        {status?.undo && (
          <>
            {" "}
            <button type="button" className="linkbtn" onClick={undo}>
              Undo
            </button>
          </>
        )}
      </p>
    </>
  );
}

let seq = 0;
/** Stable-enough unique id for rows created in the browser. */
export const rowId = () => `r${Date.now().toString(36)}${(seq++).toString(36)}`;
