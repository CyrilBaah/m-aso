import type { CSSProperties } from "react";

type Shape = { kind: "coral" | "blue" | "yellow" | "ring"; style: CSSProperties };

/** The landing page's floating hero shapes, reused as page-head decoration. Hidden on phones. */
export function Shapes({ items }: { items: Shape[] }) {
  return (
    <div className="shapes" aria-hidden="true">
      {items.map((s, i) => (
        <i key={i} className={`s-${s.kind}`} style={s.style} />
      ))}
    </div>
  );
}
