"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/Icon";
import { KEYS, resetSession, store } from "@/lib/store";

/** Opens a fresh room: clears the last session and offers the share link. */
export function CopyLink({ code, linkClassName }: { code: string; linkClassName?: string }) {
  const link = `maso.app/room/${code}`;
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");

  useEffect(() => {
    resetSession();
    store.set(KEYS.room, code);
  }, [code]);

  useEffect(() => {
    if (state === "idle") return;
    const t = setTimeout(() => setState("idle"), 1600);
    return () => clearTimeout(t);
  }, [state]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setState("copied");
    } catch {
      setState("failed");
    }
  }

  return (
    <>
      <span className={linkClassName}>{link}</span>
      <button className="btn ghost sm" type="button" onClick={copy}>
        <Icon name="copy" />
        <span>{state === "copied" ? "Copied" : state === "failed" ? "Copy failed" : "Copy link"}</span>
      </button>
      <span className="sr" role="status">
        {state === "copied" ? "Link copied" : state === "failed" ? "Could not copy, select the link instead" : ""}
      </span>
    </>
  );
}
