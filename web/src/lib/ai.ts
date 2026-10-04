/* Client for the m’aso AI service (ai/): rooms, live captions and Gemma summaries. */

export const AI_URL = (process.env.NEXT_PUBLIC_AI_URL ?? "http://localhost:8000").replace(/\/$/, "");
export const WS_URL = AI_URL.replace(/^http/, "ws");

export type ServerEvent =
  | { type: "welcome"; sid: number; whisper: string }
  | { type: "history"; lines: CaptionEvent[] }
  | { type: "presence"; participants: number; names: string[] }
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

/** Opens a room on the AI service. Throws with a person-readable message when it can’t. */
export async function createRoom(): Promise<string> {
  try {
    const res = await fetch(`${AI_URL}/rooms`, { method: "POST" });
    if (res.ok) return (await res.json()).code as string;
  } catch {}
  throw new Error("The m’aso service isn’t reachable, so a room can’t be opened. Check that it’s running, then try again.");
}

export type RoomLookup = { state: "open"; participants: number } | { state: "missing" } | { state: "unreachable" };

/** Checks that a room is open before someone joins it. */
export async function findRoom(code: string, signal?: AbortSignal): Promise<RoomLookup> {
  try {
    const res = await fetch(`${AI_URL}/rooms/${encodeURIComponent(code)}`, { signal });
    if (res.ok) return { state: "open", participants: (await res.json()).participants as number };
    return { state: "missing" };
  } catch (err) {
    if (signal?.aborted) throw err;
    return { state: "unreachable" };
  }
}

/** Removes the room's transcript from the service. Uses keepalive so it survives navigation. */
export function deleteRoom(code: string) {
  fetch(`${AI_URL}/rooms/${encodeURIComponent(code)}`, { method: "DELETE", keepalive: true }).catch(() => {});
}

export type SpokenLine = { speaker: string; kind: "speech" | "typed"; text: string };

export type Summary = {
  decisions: string[];
  action_items: { task: string; owner: string | null; due: string | null }[];
  key_dates: string[];
  open_questions: string[];
};

/** Gemma reads the conversation. Throws with a person-readable message when it can’t. */
export async function summarise(code: string, lines: SpokenLine[], signal?: AbortSignal): Promise<Summary> {
  let res: Response;
  try {
    res = await fetch(`${AI_URL}/rooms/${encodeURIComponent(code)}/summary`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lines }),
      signal,
    });
  } catch (err) {
    if (signal?.aborted) throw err;
    throw new Error("The m’aso AI service isn’t reachable, so Gemma couldn’t write a summary.");
  }
  if (res.status === 404 || res.status === 405)
    throw new Error("The m’aso AI service running here is out of date. Restart it to get Gemma summaries.");
  if (!res.ok) {
    const detail = await res.json().then((b) => b.detail as string).catch(() => "");
    throw new Error(detail || "Gemma couldn’t write a summary this time.");
  }
  return (await res.json()).summary as Summary;
}
