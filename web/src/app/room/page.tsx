import type { Metadata } from "next";
import { AppNav } from "@/components/AppNav";
import { RoomCode } from "@/components/RoomCode";
import { Room } from "./Room";
import s from "./room.module.css";

export const metadata: Metadata = { title: "Conversation room" };

export default function RoomPage() {
  return (
    <>
      <AppNav
        back={{ href: "/consent", label: "Back to consent" }}
        meta={
          <span className="roomtag">
            <RoomCode /> · private room
          </span>
        }
      />
      <main id="main" className={`main ${s.page}`}>
        <Room />
      </main>
    </>
  );
}
