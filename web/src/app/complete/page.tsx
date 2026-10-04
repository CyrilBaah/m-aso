import type { Metadata } from "next";
import Link from "next/link";
import { AppNav } from "@/components/AppNav";
import { Arrow, Icon } from "@/components/Icon";
import { Shapes } from "@/components/Shapes";
import { delay } from "@/lib/ui";
import s from "./complete.module.css";

export const metadata: Metadata = { title: "Complete" };

const STATUS = {
  saved: { text: "Your summary was saved in this browser.", tone: "" },
  deleted: { text: "Your session data was deleted.", tone: "is-coral" },
} as const;

export default async function CompletePage({ searchParams }: PageProps<"/complete">) {
  const { status } = await searchParams;
  const note = STATUS[status as keyof typeof STATUS] ?? { text: "Your session has ended safely.", tone: "" };
  return (
    <>
      <AppNav back={{ href: "/", label: "m’aso home" }} />
      <main id="main" className="main narrow">
        <header className="pagehead">
          <Shapes
            items={[
              { kind: "coral", style: { left: "2%", top: 10 } },
              { kind: "blue", style: { right: "4%", top: 40 } },
              { kind: "yellow", style: { left: "-4%", top: 330 } },
              { kind: "ring", style: { right: "-2%", top: 300 } },
            ]}
          />
          <div className={s.mark}>
            <Icon name="check" />
          </div>
          <div className="eyebrow rise" style={delay(0.1)}>
            Session complete
          </div>
          <h1 className="title rise" style={delay(0.16)}>
            Your conversation is in your hands.
          </h1>
          <p className="lead rise" style={delay(0.22)}>
            You chose what to keep and what to delete. The room has now ended.
          </p>
          <div className="actions center rise" style={delay(0.28)}>
            <Link className="btn primary" href="/start">
              Start another room <Arrow />
            </Link>
            <Link className="btn ghost" href="/">
              Back to m’aso
            </Link>
          </div>
          <p className={`statusnote rise ${note.tone} ${s.note}`} style={delay(0.34)} role="status">
            <i />
            <span>{note.text}</span>
          </p>
        </header>
      </main>
    </>
  );
}
