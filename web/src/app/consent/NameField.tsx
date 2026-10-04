"use client";

import { KEYS, store, useStored } from "@/lib/store";

/** Optional name shown beside your captions, so a shared room knows who said what. */
export function NameField({ className }: { className?: string }) {
  const name = useStored(KEYS.name, "");
  return (
    <div className={`field ${className ?? ""}`}>
      <label htmlFor="name">Your name, shown next to your captions</label>
      <input
        id="name"
        value={name}
        maxLength={40}
        autoComplete="given-name"
        placeholder="e.g. Ama"
        onChange={(e) => store.set(KEYS.name, e.target.value)}
      />
    </div>
  );
}
