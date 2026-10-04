/* Caption helpers: spot dates, times and follow-ups in a finished caption line.
   Pattern-based on purpose. Gemma does the deeper reading at the end of the session. */

const DAY =
  "monday|tuesday|wednesday|thursday|friday|saturday|sunday|today|tomorrow|tonight|next week|this morning|this afternoon";
// "2 PM", "2pm", "3 p.m." (a trailing sentence full stop is not swallowed), "10:30", "noon"
const TIME = "\\d{1,2}(?::\\d{2})?\\s*[ap]\\.?m(?:(?<=\\.m)\\.)?|\\d{1,2}:\\d{2}|noon|midday";
const WHEN_SOURCE = `\\b(?:(?:${DAY})(?:\\s+(?:at|by|before)\\s+(?:${TIME}))?|(?:${TIME}))(?!\\w)`;
const TASK =
  /\b(?:i(?:'|’)ll|i will|we(?:'|’)ll|we will|please|can you|could you|need to|remember to|don(?:'|’)t forget to)\s+([^.?!]{3,70})/gi;

const when = () => new RegExp(WHEN_SOURCE, "gi");
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);

export type Detail = { label: string; text: string; tone: "" | "is-blue" };

export function detect(line: string): Detail[] {
  const found: Detail[] = [];
  for (const m of line.matchAll(when()))
    found.push({ label: cap(m[0].replace(/\s+/g, " ")), text: `Heard: “${clip(line, 58)}”`, tone: "" });
  for (const m of line.matchAll(TASK)) found.push({ label: cap(clip(m[1].trim(), 48)), text: "Follow-up", tone: "is-blue" });
  return found;
}

/** Splits a line so dates and times can be highlighted. */
export function segments(line: string): { text: string; mark: boolean }[] {
  const out: { text: string; mark: boolean }[] = [];
  let last = 0;
  for (const m of line.matchAll(when())) {
    const i = m.index ?? 0;
    if (i > last) out.push({ text: line.slice(last, i), mark: false });
    out.push({ text: m[0], mark: true });
    last = i + m[0].length;
  }
  if (last < line.length) out.push({ text: line.slice(last), mark: false });
  return out;
}
