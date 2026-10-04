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
            <div className={s.eyebrow}>Built for a teammate who couldn’t hear us</div>
            <h1>
              Make room for <span className={s.highlight}>every voice.</span>
            </h1>
            <p>
              Our teammate couldn’t hear us, so we typed and turned the screen around. m’aso does it properly: live
              captions, typing for everyone, and a note of what was agreed.
            </p>
            <Link className={s.maincta} href="/start">
              <span>Start a conversation</span> <span className={s.arrow}>→</span>
            </Link>
          </section>

          <section className={s.showcase} id="showcase">
            <div className={s.showcaseTitle}>
              <span>Speak, read,</span>
              <span>and type in</span>
              <span>your own way.</span>
            </div>
            <div className={s.showcaseSub}>
              Open models run on your own laptop, so a private conversation between teammates stays private.
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
                <div className={s.mocklabel}>SHOW ON SCREEN</div>
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
