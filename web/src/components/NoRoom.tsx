import Link from "next/link";
import { Arrow } from "@/components/Icon";

/** Shown when someone lands on a room screen without having created or joined a room. */
export function NoRoom() {
  return (
    <section className="card" role="status" style={{ maxWidth: 520, margin: "0 auto", textAlign: "center" }}>
      <h2 className="cardtitle">You’re not in a room yet.</h2>
      <p className="body">Start a room, or join one with the code your teammate shared.</p>
      <div className="actions center">
        <Link className="btn primary" href="/start">
          Start or join a room <Arrow />
        </Link>
      </div>
    </section>
  );
}
