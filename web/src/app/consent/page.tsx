import type { Metadata } from "next";
import { AppNav } from "@/components/AppNav";
import { Icon } from "@/components/Icon";
import { Shapes } from "@/components/Shapes";
import { delay } from "@/lib/ui";
import { ConsentPanel } from "./ConsentPanel";
import s from "./consent.module.css";

export const metadata: Metadata = { title: "Consent" };

const PROMISES = [
  { icon: "eye", tone: "", title: "Both of you agree", text: "Captions wait until everyone in the room has agreed, and everyone sees when they’re on." },
  { icon: "shield", tone: "is-blue", title: "Private by default", text: "m’aso never saves raw audio. Its own speech model writes the captions, not a third party." },
  { icon: "trash", tone: "is-coral", title: "Yours to delete", text: "End the session and delete its summary at any time." },
] as const;

export default function ConsentPage() {
  return (
    <>
      <AppNav back={{ href: "/start", label: "Back to start" }} />
      <main id="main" className="main">
        <header className="pagehead">
          <Shapes items={[{ kind: "yellow", style: { left: "-12%", top: 170 } }, { kind: "ring", style: { right: "-9%", top: 150 } }]} />
          <div className="eyebrow rise">Shared consent</div>
          <h1 className="title rise" style={delay(0.08)}>
            Ready when you are.
          </h1>
          <p className="lead rise" style={delay(0.16)}>
            You and your teammate choose when captions begin. Nothing starts until both of you agree.
          </p>
        </header>
        <ConsentPanel
          promises={
            <ul className={`itemlist ${s.list}`}>
              {PROMISES.map((p) => (
                <li className="item" key={p.title}>
                  <span className={`tile sm ${p.tone}`}>
                    <Icon name={p.icon} />
                  </span>
                  <div>
                    <b>{p.title}</b>
                    <span>{p.text}</span>
                  </div>
                </li>
              ))}
            </ul>
          }
        />
      </main>
    </>
  );
}
