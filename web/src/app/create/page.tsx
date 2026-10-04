import type { Metadata } from "next";
import { AppNav } from "@/components/AppNav";
import { delay } from "@/lib/ui";
import { CreateRoom } from "./CreateRoom";

export const metadata: Metadata = { title: "Create room" };

export default function CreatePage() {
  return (
    <>
      <AppNav back={{ href: "/start", label: "Back" }} />
      <main id="main" className="main narrow">
        <header className="pagehead">
          <div className="eyebrow rise">Your private room</div>
          <h1 className="title rise" style={delay(.08)}>
            Your room is ready to share.
          </h1>
          <p className="lead rise" style={delay(.16)}>
            Send this code to your teammate. You’ll both agree before captions begin.
          </p>
        </header>
        <CreateRoom />
      </main>
    </>
  );
}
