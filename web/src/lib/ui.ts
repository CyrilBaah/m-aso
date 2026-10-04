import type { CSSProperties } from "react";

/** Entrance stagger for `.rise` elements. */
export const delay = (seconds: number): CSSProperties => ({ ["--d" as string]: `${seconds}s` });
