"use client";

import { useEffect, useRef } from "react";
import { DEMO_LINES } from "@/lib/captions";
import type { CaptionHandlers } from "./types";

/** Plays scripted sample lines, word by word or as whole phrases. Always labelled as simulated. */
export function useDemoCaptions(active: boolean, pace: "instant" | "steady", handlers: CaptionHandlers) {
  const index = useRef(0);
  const latest = useRef(handlers);
  useEffect(() => {
    latest.current = handlers;
  });

  useEffect(() => {
    if (!active) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const later = (fn: () => void, ms: number) => timers.push(setTimeout(fn, ms));

    function play() {
      const line = DEMO_LINES[index.current++ % DEMO_LINES.length];
      if (pace === "instant") {
        const words = line.split(" ");
        words.forEach((_, i) => later(() => latest.current.onInterim(words.slice(0, i + 1).join(" ")), i * 150));
        later(() => {
          latest.current.onFinal(line);
          later(play, 2600);
        }, words.length * 150 + 250);
      } else {
        latest.current.onFinal(line);
        later(play, 4200);
      }
    }
    play();
    return () => timers.forEach(clearTimeout);
  }, [active, pace]);
}
