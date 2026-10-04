"use client";

import { useSyncExternalStore } from "react";

/* Browser-local session state. Every access is guarded: storage can be blocked
   (private windows, strict settings) and the app must still work without it. */

const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export const store = {
  get(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key: string, value: string) {
    try {
      localStorage.setItem(key, value);
    } catch {}
    emit();
  },
  del(key: string) {
    try {
      localStorage.removeItem(key);
    } catch {}
    emit();
  },
  json<T>(key: string, fallback: T): T {
    try {
      const raw = localStorage.getItem(key);
      return raw === null ? fallback : (JSON.parse(raw) as T);
    } catch {
      return fallback;
    }
  },
  setJson(key: string, value: unknown) {
    this.set(key, JSON.stringify(value));
  },
};

export const KEYS = {
  room: "maso_room",
  reply: "maso_reply",
  details: "maso_details",
  summary: "maso_summary",
  prefs: "maso_prefs",
  mode: "maso_mode",
  name: "maso_name",
} as const;

/** Everything a session leaves behind. Cleared on a new room or on delete. */
export function resetSession() {
  [KEYS.reply, KEYS.details, KEYS.summary].forEach((k) => store.del(k));
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  window.addEventListener("storage", cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
}

/** Reads a stored string; renders `fallback` on the server and before hydration. */
export function useStored(key: string, fallback: string): string {
  return useSyncExternalStore(
    subscribe,
    () => store.get(key) ?? fallback,
    () => fallback,
  );
}
