/* Client for the m’aso AI service (ai/). Every call fails soft: the app keeps working in demo mode. */

export const AI_URL = (process.env.NEXT_PUBLIC_AI_URL ?? "http://localhost:8000").replace(/\/$/, "");
export const WS_URL = AI_URL.replace(/^http/, "ws");

export type ServerEvent =
  | { type: "welcome"; sid: number; whisper: string }
  | { type: "history"; lines: CaptionEvent[] }
  | { type: "presence"; participants: number }
  | CaptionEvent
  | { type: "error"; code: string; message: string };

export type CaptionEvent = {
  type: "caption";
  id: number | string;
  kind: "speech" | "typed";
  speaker: string;
  sid: number;
  text: string;
  final: boolean;
};

/** Asks the service for a fresh room code; falls back to a local one so the flow never blocks. */
export async function createRoom(): Promise<string> {
  try {
    const res = await fetch(`${AI_URL}/rooms`, { method: "POST" });
    if (res.ok) return (await res.json()).code as string;
  } catch {}
  const letters = Array.from({ length: 4 }, () => String.fromCharCode(65 + Math.floor(Math.random() * 26))).join("");
  return `${letters}-${String(Math.floor(Math.random() * 1000)).padStart(3, "0")}`;
}

/** Removes the room's transcript from the service. Uses keepalive so it survives navigation. */
export function deleteRoom(code: string) {
  fetch(`${AI_URL}/rooms/${encodeURIComponent(code)}`, { method: "DELETE", keepalive: true }).catch(() => {});
}
