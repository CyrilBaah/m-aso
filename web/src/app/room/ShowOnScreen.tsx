"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/Icon";
import s from "./show.module.css";

/** Bigger text for shorter messages: a few words fill the screen, a paragraph still fits. */
function sizeFor(text: string) {
  const n = text.length;
  if (n <= 24) return "min(13vmin, 9rem)";
  if (n <= 60) return "min(9vmin, 6.5rem)";
  if (n <= 140) return "min(6.5vmin, 4.5rem)";
  return "min(4.8vmin, 3.2rem)";
}

/** Type, then turn the laptop around: the message fills the screen in huge, high-contrast text.
    What you show is also sent to the room, so it is part of the conversation and the summary. */
export function ShowOnScreen({ onSend, className }: { onSend: (text: string) => void; className?: string }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const board = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const wasOpen = useRef(false);

  // Give focus back to the button once the board has actually closed.
  useEffect(() => {
    if (wasOpen.current && !open) trigger.current?.focus();
    wasOpen.current = open;
  }, [open]);

  function show() {
    setOpen(true);
    // Fullscreen needs the click itself; ignore browsers or frames that refuse it.
    requestAnimationFrame(() => board.current?.requestFullscreen?.().catch(() => {}));
  }

  function send() {
    const t = text.trim();
    if (t) onSend(t);
    setText("");
  }

  function close() {
    send();
    setOpen(false);
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  }

  // Leaving fullscreen with the browser's own Esc closes the board too.
  useEffect(() => {
    if (!open) return;
    const onChange = () => {
      if (!document.fullscreenElement && board.current && !board.current.hidden) close();
    };
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  });

  return (
    <>
      <button ref={trigger} className={className} type="button" onClick={show} id="showBtn">
        <Icon name="screen" />
        <span>Show on screen</span>
      </button>
      {open && (
        <div
          ref={board}
          className={s.board}
          role="dialog"
          aria-modal="true"
          aria-label="Show on screen"
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.preventDefault();
              close();
            }
          }}
        >
          <div className={s.bar}>
            <span>Type, then turn your screen to your teammate.</span>
            <div className={s.actions}>
              <button type="button" className={s.ghost} onClick={send} disabled={!text.trim()}>
                Send and clear
              </button>
              <button type="button" className={s.done} onClick={close}>
                Done
              </button>
            </div>
          </div>
          <label className="sr" htmlFor="showText">
            Message to show
          </label>
          <textarea
            id="showText"
            className={s.text}
            style={{ fontSize: sizeFor(text) }}
            value={text}
            autoFocus
            placeholder="Type what you want to say…"
            onChange={(e) => setText(e.target.value)}
          />
        </div>
      )}
    </>
  );
}
