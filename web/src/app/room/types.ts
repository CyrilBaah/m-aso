export type CaptionHandlers = {
  /** Words recognised so far in the line being spoken. */
  onInterim: (text: string) => void;
  /** A finished line. */
  onFinal: (text: string) => void;
};

export type Prefs = { size: "s" | "m" | "l" | "xl"; pace: "instant" | "steady"; contrast: boolean };

export const DEFAULT_PREFS: Prefs = { size: "m", pace: "instant", contrast: false };
