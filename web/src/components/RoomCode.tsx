"use client";

import { KEYS, useStored } from "@/lib/store";

/** The current room code, from the room the person created or joined. */
export function RoomCode() {
  return <>{useStored(KEYS.room, "WORK-482")}</>;
}
