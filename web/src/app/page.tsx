import Link from "next/link";
import Image from "next/image";
import s from "./landing.module.css";

export default function Home() {
  return (
    <>
      <a className="skip" href="#main">
        Skip to content
      </a>
      <div className={s.shell}>
        <nav className={s.nav} aria-label="m’aso">
          <Link className={s.brand} href="/">
            <span className={s.brandmark} aria-hidden="true">
              <Image src="/maso-mark.svg" alt="" width={40} height={40} preload />
            </span>
            <span>m’aso</span>
          </Link>
          <div className={s.navlinks}>
            <a href="#showcase">How it works</a>
          </div>
        </nav>
        <main id="main" className={s.content}>
          <section className={s.hero}>
            <div className={`${s.shape} ${s.one}`} aria-hidden="true" />
            <div className={`${s.shape} ${s.two}`} aria-hidden="true" />
            <div className={`${s.shape} ${s.three}`} aria-hidden="true" />
            <div className={`${s.shape} ${s.four}`} aria-hidden="true" />
            <div className={s.eyebrow}>Communication access for the workplace</div>
            <h1>
              Make room for <span className={s.highlight}>every voice.</span>
            </h1>
            <p>
              m’aso gives Deaf and hard-of-hearing colleagues live captions, typed replies, and a private record of what
              was agreed.
            </p>
            <Link className={s.maincta} href="/start" aria-label="See how m’aso works">
              <span>See how it works</span> <span className={s.arrow}>→</span>
            </Link>
          </section>

          <section className={s.showcase} id="showcase">
            <div className={s.showcaseTitle}>
              <span>Speak, read,</span>
              <span>and reply in</span>
              <span>your own way.</span>
            </div>
            <div className={s.showcaseSub}>
              A shared workplace space for live captions and typed replies, with privacy built in from the start.
            </div>
            <div className={s.cards} aria-hidden="true">
              <div className={s.mock}>
                <div className={s.mocktop} />
                <div className={s.mocklabel}>LIVE CAPTIONS</div>
                <div className={`${s.mockline} ${s.dark}`} />
                <div className={s.mockline} />
                <div className={s.mockbubble}>Thursday at 2 PM</div>
                <div className={s.wave}>
                  <i /><i /><i /><i /><i /><i />
                </div>
              </div>
              <div className={s.mock}>
                <div className={s.mocktop} />
                <div className={s.mocklabel}>TWO-WAY REPLY</div>
                <div className={`${s.mockline} ${s.dark}`} />
                <div className={s.mockline} />
                <div className={s.mockbubble}>I can follow that</div>
                <div className={s.mockline} />
              </div>
              <div className={s.mock}>
                <div className={s.mocktop} />
                <div className={s.mocklabel}>AI SUMMARY</div>
                <div className={`${s.mockline} ${s.dark}`} />
                <div className={s.summarydot}>● Meeting time</div>
                <div className={s.summarydot}>● Send agenda</div>
                <div className={s.mockbubble}>Meeting summary</div>
              </div>
            </div>
          </section>
        </main>
      </div>
    </>
  );
}
