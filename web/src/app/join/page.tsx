import type { Metadata } from "next";
import { AppNav } from "@/components/AppNav";
import { delay } from "@/lib/ui";
import { JoinForm } from "./JoinForm";

export const metadata: Metadata = { title: "Join room" };

export default async function JoinPage({ searchParams }: PageProps<"/join">) {
  const { code } = await searchParams;
  return (
    <>
      <AppNav back={{ href: "/start", label: "Back" }} />
      <main id="main" className="main narrow">
        <header className="pagehead">
          <div className="eyebrow rise">Join your teammate</div>
          <h1 className="title rise" style={delay(0.08)}>
            Enter your teammate’s room.
          </h1>
          <p className="lead rise" style={delay(0.16)}>
            Use the room code they shared with you. You will both confirm before captions begin.
          </p>
        </header>
        <JoinForm initialCode={typeof code === "string" ? code : ""} />
      </main>
    </>
  );
}
