import type { Metadata } from "next";
import Link from "next/link";
import { AppNav } from "@/components/AppNav";
import { delay } from "@/lib/ui";
import { Arrow } from "@/components/Icon";
import { CopyLink } from "./CopyLink";
import s from "./create.module.css";

export const metadata: Metadata = { title: "Create room" };

const CODE = "WORK-482";

export default function CreatePage() {
  return (
    <>
      <AppNav back={{ href: "/start", label: "Back" }} />
      <main id="main" className="main narrow">
        <header className="pagehead">
          <div className="eyebrow rise">Create a private room</div>
          <h1 className="title rise" style={delay(.08)}>
            Your room is ready to share.
          </h1>
          <p className="lead rise" style={delay(.16)}>
            Send this code to your colleague. Both of you will confirm before captions begin.
          </p>
        </header>
        <div className="rise" style={delay(.24)}>
          <div className="roomcode" aria-label="Room code">
            {CODE}
          </div>
          <p className={s.share}>
            Share link · <CopyLink code={CODE} linkClassName={s.link} />
          </p>
        </div>
        <section className={`card accent static rise ${s.waiting}`} style={delay(.32)}>
          <ul className="itemlist">
            <li className="item">
              <span className="dot is-yellow" />
              <div>
                <b>Waiting for your colleague</b>
                <span>They can join with the code above.</span>
              </div>
            </li>
          </ul>
          <div className="actions">
            <Link className="btn primary" href="/consent">
              Continue to consent <Arrow />
            </Link>
            <Link className="btn ghost" href="/start">
              Cancel
            </Link>
          </div>
        </section>
      </main>
    </>
  );
}
