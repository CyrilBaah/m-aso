import type { Metadata } from "next";
import Link from "next/link";
import { AppNav } from "@/components/AppNav";
import { Arrow, Icon } from "@/components/Icon";
import { Shapes } from "@/components/Shapes";
import { delay } from "@/lib/ui";
import { RoomPresence } from "./RoomPresence";
import s from "./consent.module.css";

export const metadata: Metadata = { title: "Consent" };

const PROMISES = [
  { icon: "eye", tone: "", title: "Shared visibility", text: "Everyone can see when captions are active." },
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
        <section className={`${s.panel} rise`} style={delay(0.24)}>
          <RoomPresence />
          <article className="card">
            <h2 className="cardtitle">Before you start.</h2>
            <p className="body">Both participants will see the same captions and can type replies.</p>
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
            <div className="actions">
              <Link className="btn primary" href="/room">
                I agree, start captions <Arrow />
              </Link>
              <Link className="btn ghost" href="/start">
                Not now
              </Link>
            </div>
          </article>
        </section>
      </main>
    </>
  );
}
