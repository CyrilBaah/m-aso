export type Prefs = { size: "s" | "m" | "l" | "xl"; pace: "instant" | "steady"; contrast: boolean };

export const DEFAULT_PREFS: Prefs = { size: "m", pace: "instant", contrast: false };
