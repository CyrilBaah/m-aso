import type { Metadata } from "next";
import { AppNav } from "@/components/AppNav";
import { Icon } from "@/components/Icon";
import { delay } from "@/lib/ui";
import { SummaryCard } from "./SummaryCard";
import s from "./summary.module.css";

export const metadata: Metadata = { title: "Summary" };

export default function SummaryPage() {
  return (
    <>
      <AppNav back={{ href: "/room", label: "Back to conversation" }} />
      <main id="main" className={`main ${s.page}`}>
        <header className="pagehead">
          <div className="eyebrow rise">Review your conversation</div>
          <h1 className="title rise" style={delay(0.08)}>
            Keep what matters.
          </h1>
          <p className="lead rise" style={delay(0.16)}>
            Review the conversation before you save or delete anything.
          </p>
        </header>
        <section className={`${s.grid} rise`} style={delay(0.24)}>
          <article className={`panel-dark ${s.done}`}>
            <span className="tile">
              <Icon name="check" />
            </span>
            <div className="eyebrow">Conversation complete</div>
            <h2>Your session is ready to review.</h2>
            <p className="body">m’aso did not save raw audio. You decide whether this summary stays with you.</p>
          </article>
          <SummaryCard />
        </section>
      </main>
    </>
  );
}
