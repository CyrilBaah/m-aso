import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

type Props = {
  back: { href: string; label: string };
  /** Extra items shown before the back link, e.g. the room code. */
  meta?: ReactNode;
};

/** Skip link + the rounded app navigation shared by every flow screen. */
export function AppNav({ back, meta }: Props) {
  const backLink = (
    <Link className="back" href={back.href}>
      <span aria-hidden="true">←</span> {back.label}
    </Link>
  );
  return (
    <>
      <a className="skip" href="#main">
        Skip to content
      </a>
      <nav className="appnav" aria-label="m’aso">
        <Link className="appbrand" href="/">
          <Image src="/maso-mark.svg" alt="" width={40} height={40} preload />
          m’aso
        </Link>
        {meta ? (
          <div className="navmeta">
            {meta}
            {backLink}
          </div>
        ) : (
          backLink
        )}
      </nav>
    </>
  );
}
