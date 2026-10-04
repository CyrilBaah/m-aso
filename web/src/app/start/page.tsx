import type { Metadata } from "next";
import Link from "next/link";
import { AppNav } from "@/components/AppNav";
import { delay } from "@/lib/ui";
import { Arrow, Icon } from "@/components/Icon";
import { Shapes } from "@/components/Shapes";
import s from "./start.module.css";

export const metadata: Metadata = { title: "Start" };

export default function StartPage() {
  return (
    <>
      <AppNav back={{ href: "/", label: "Back to m’aso" }} />
      <main id="main" className="main">
        <header className="pagehead">
          <Shapes items={[{ kind: "coral", style: { left: "-6%", top: 70 } }, { kind: "blue", style: { right: "-4%", top: 96 } }]} />
          <div className="eyebrow rise">Talk with your teammate</div>
          <h1 className="title rise" style={delay(.08)}>
            Choose how you want to join.
          </h1>
          <p className="lead rise" style={delay(.16)}>
            Open a private room for the two of you, or join the one your teammate opened.
          </p>
        </header>
        <section className={`${s.choices} rise`} style={delay(.24)} aria-label="Start or join">
          <article className={`card accent lift ${s.choice}`}>
            <div className="tile">
              <Icon name="plus" />
            </div>
            <h2 className="cardtitle">Start a room</h2>
            <p className="body">Open a room and share its code or link with your teammate.</p>
            <Link className="btn primary" href="/create">
              Create room <Arrow />
            </Link>
          </article>
          <article className={`card accent lift is-blue ${s.choice}`}>
            <div className="tile is-blue">
              <Icon name="enter" />
            </div>
            <h2 className="cardtitle">Join a room</h2>
            <p className="body">Enter the code your teammate shared with you.</p>
            <form className={s.joinform} action="/join" method="get">
              <div className="field">
                <label htmlFor="code">Room code</label>
                <input
                  id="code"
                  name="code"
                  placeholder="e.g. WORK-482"
                  autoComplete="off"
                  autoCapitalize="characters"
                  spellCheck={false}
                  required
                  pattern="[A-Za-z]{4}-?[0-9]{3}"
                  title="Four letters and three numbers, like WORK-482"
                />
              </div>
              <button className="btn secondary" type="submit">
                Join room <Arrow />
              </button>
            </form>
          </article>
        </section>
        <p className="footnote">
          <b>Private by default.</b> Both participants confirm before captions begin.
        </p>
      </main>
    </>
  );
}
