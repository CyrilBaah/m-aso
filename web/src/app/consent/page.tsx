import type { Metadata } from "next";
import Link from "next/link";
import { AppNav } from "@/components/AppNav";
import { Arrow, Icon } from "@/components/Icon";
import { RoomCode } from "@/components/RoomCode";
import { Shapes } from "@/components/Shapes";
import { delay } from "@/lib/ui";
import { NameField } from "./NameField";
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
            You and your colleague choose when the conversation begins. Nothing starts until both of you agree.
          </p>
        </header>
        <section className={`${s.panel} rise`} style={delay(0.24)}>
          <article className={`panel-dark ${s.status}`}>
            <span className="live">Room ready</span>
            <h2>You’re both here.</h2>
            <p className="body">
              You and your colleague are in private room{" "}
              <strong className={s.code}>
                <RoomCode />
              </strong>
              . Take a moment, then begin together.
            </p>
            <NameField className={s.name} />
            <div className="chips">
              <span className="chip">
                <i />
                You
              </span>
              <span className="chip">
                <i />
                Your colleague
              </span>
            </div>
          </article>
          <article className="card">
            <h2 className="cardtitle">Captioning with care.</h2>
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
