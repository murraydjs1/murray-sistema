"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

const chapters = [
  { time: "22:47", title: "La previa", copy: "Todavía se puede hablar. Pero algo en el aire ya cambió.", bpm: "92", track: "Africa", artist: "Toto", spotifyId: "6plRwenssWRPbd5WIT1OLO" },
  { time: "00:16", title: "La pista elige", copy: "Una canción une a todos. Desde acá, la noche toma el control.", bpm: "118", track: "Call Me", artist: "Ivana Spagna", spotifyId: "0pChBF3vaY6EQmVA8clO3a" },
  { time: "02:08", title: "El drop", copy: "No hay invitados ni anfitriones. Hay una sola pista.", bpm: "128", track: "Titanium", artist: "David Guetta ft. Sia", spotifyId: "0uLVo8fL5jaygYldFItugv" },
] as const;

const whatsappUrl = "https://wa.me/5491161389580?text=Hola%20Murray%20DJs%2C%20quiero%20consultar%20disponibilidad%20para%20una%20fiesta.";

const djs = [
  { name: "Micky", image: "/djs/micky.jpg", position: "50% 42%", role: "La experiencia", description: "El origen de Murray. Años leyendo pistas y encontrando esa canción que une a todas las generaciones." },
  { name: "Maicky", image: "/djs/maicky.jpg", position: "50% 40%", role: "El presente", description: "Energía, actualidad y conexión con la gente. Siempre atento al momento exacto en que la fiesta cambia." },
  { name: "Paddy", image: "/djs/paddy.jpg", position: "50% 40%", role: "La intensidad", description: "Una selección directa y enérgica, pensada para levantar la pista y mantenerla arriba." },
  { name: "Luis", image: "/djs/luis.jpg", position: "50% 38%", role: "La nueva generación", description: "Una mirada joven y fresca que suma nuevos sonidos a la historia musical de la familia." },
] as const;

const eventTypes = [
  { title: "Cumpleaños y aniversarios", description: "Fiestas de 40, 50, 60 y más, donde distintas generaciones terminan compartiendo la misma pista.", featured: true },
  { title: "Casamientos", description: "Desde la recepción hasta el último tema. Construimos la música de cada momento junto a los novios.", featured: false },
  { title: "Eventos corporativos", description: "Celebraciones, cierres de año y encuentros donde la música acompaña la identidad y la energía del evento.", featured: false },
  { title: "Fiestas privadas", description: "Escuchamos la idea, conocemos a los invitados y diseñamos una noche con un clima completamente propio.", featured: false },
] as const;

export function PartyExperience() {
  const pageRef = useRef<HTMLElement>(null);
  const [selectedTrack, setSelectedTrack] = useState<string | null>(null);
  const [isSoundtrackOpen, setIsSoundtrackOpen] = useState(false);
  const [bpm, setBpm] = useState(92);
  const activeChapter = chapters.find((chapter) => chapter.spotifyId === selectedTrack);

  useEffect(() => {
    const onPointerMove = (event: PointerEvent) => {
      pageRef.current?.style.setProperty("--pointer-x", `${event.clientX}px`);
      pageRef.current?.style.setProperty("--pointer-y", `${event.clientY}px`);
    };
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - innerHeight;
      const progress = max > 0 ? scrollY / max : 0;
      pageRef.current?.style.setProperty("--party-progress", `${progress}`);
      setBpm(Math.round(92 + progress * 36));
    };
    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            revealObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -8%" },
    );
    const revealElements = pageRef.current?.querySelectorAll<HTMLElement>("[data-party-reveal]");
    revealElements?.forEach((element) => revealObserver.observe(element));
    addEventListener("pointermove", onPointerMove);
    addEventListener("scroll", onScroll, { passive: true });
    return () => {
      removeEventListener("pointermove", onPointerMove);
      removeEventListener("scroll", onScroll);
      revealObserver.disconnect();
    };
  }, []);

  return (
    <main className="party-page party-v2" ref={pageRef}>
      <div className="party-cursor-light" aria-hidden="true" />
      <div className="party-noise" aria-hidden="true" />
      <div className="party-progress" aria-hidden="true"><i /></div>
      <aside className="party-bpm" aria-label={`${bpm} pulsaciones por minuto`}><span>{bpm}</span><small>BPM</small><i /></aside>

      <nav className="party-nav" aria-label="Navegación principal">
        <Image src="/brand/murray-logo-dark.png" alt="Murray DJs" width={190} height={58} className="party-logo" priority />
        <Link href="#nosotros" className="party-nav-center">NOSOTROS</Link>
        <a href={whatsappUrl} target="_blank" rel="noreferrer" className="party-nav-cta">Consultar fecha</a>
      </nav>

      <section className="party-hero">
        <Image
          src="/experience-video/hero-micky-party.png"
          alt="Micky Murray frente a la pista durante una fiesta"
          fill
          sizes="100vw"
          priority
          quality={95}
          className="party-hero-background"
        />
        <div className="party-hero-background-shade" aria-hidden="true" />
        <div className="party-hero-orbit" aria-hidden="true">
          <svg viewBox="0 0 440 440">
            <defs>
              <path id="party-orbit-path" d="M 220 220 m -190 0 a 190 190 0 1 1 380 0 a 190 190 0 1 1 -380 0" />
            </defs>
            <text>
              <textPath href="#party-orbit-path" startOffset="0%" textLength="1160" lengthAdjust="spacing">
                MURRAY · MUSIC · PEOPLE · MOMENTS · MURRAY · MUSIC · PEOPLE · MOMENTS ·
              </textPath>
            </text>
          </svg>
        </div>
        <div className="party-status"><i /> Sesión en vivo</div>
        <h1 className="party-family-hero">
          <span>Familia<i>,</i></span>
          <span>Pasión<i>,</i></span>
          <span>Música<i>.</i></span>
        </h1>
        <p>Dos generaciones haciendo de cada evento<br className="party-desktop-break" /> una noche para <strong>recordar.</strong></p>
        <button
          type="button"
          className="party-main-cta"
          onClick={() => setIsSoundtrackOpen(true)}
        >
          Entrá a la pista <span>↓</span>
        </button>
        <div className="party-pulse" aria-hidden="true">
          {Array.from({ length: 32 }, (_, index) => <i key={index} style={{ animationDelay: `${-index * 0.07}s` }} />)}
        </div>
        <div className="party-floor" aria-hidden="true"><i /><i /><i /><i /><i /></div>
      </section>

      <section className="party-djs" id="nosotros" aria-labelledby="party-djs-title" data-party-reveal>
        <header>
          <span className="party-kicker">Nosotros</span>
          <h2 id="party-djs-title">Una familia<br /><em>detrás de la noche.</em></h2>
          <p>Somos Micky y sus tres hijos, Maicky, Paddy y Luis. Cuatro DJs de dos generaciones, unidos por la música y por una misma manera de vivir cada fiesta: escuchar a la gente, leer el momento y encontrarnos todos en la pista.</p>
        </header>
        <div className="party-dj-grid">
          {djs.map((dj, index) => (
            <article className="party-dj-card" key={dj.name}>
              <div className="party-dj-photo">
                <Image src={dj.image} alt={`${dj.name}, DJ de Murray`} fill sizes="(max-width: 700px) 90vw, 25vw" style={{ objectPosition: dj.position }} />
                <span aria-hidden="true">0{index + 1}</span>
              </div>
              <div className="party-dj-copy">
                <h3>{dj.name}</h3>
                <strong>{dj.role}</strong>
                <p>{dj.description}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="party-generations" aria-label="La esencia de una fiesta Murray" data-party-reveal>
        <Image
          src="/experience-video/generations-party-hd.png"
          alt="Una pista llena de personas de distintas generaciones bailando"
          fill
          sizes="100vw"
          quality={100}
          unoptimized
          className="party-generations-image"
        />
        <div className="party-generations-shade" aria-hidden="true" />
        <div className="party-generations-copy">
          <span className="party-kicker">Lo que buscamos en cada fiesta</span>
          <h2>Cuando se juntan<br /><em>generaciones,</em><br />empieza la verdadera fiesta.</h2>
          <p>No importa la edad. Importa encontrar esa canción que hace que todos quieran estar en la pista.</p>
        </div>
      </section>

      <section className="party-events" aria-labelledby="party-events-title" data-party-reveal>
        <header>
          <span className="party-kicker">Lo que hacemos</span>
          <h2 id="party-events-title">Una pista.<br /><em>Muchas formas</em><br />de celebrarla.</h2>
          <p>Cada evento tiene su propia energía. Nosotros encontramos la música que la convierte en una noche para recordar.</p>
        </header>
        <div className="party-events-list">
          {eventTypes.map((eventType, index) => (
            <article className={eventType.featured ? "is-featured" : ""} key={eventType.title} tabIndex={0}>
              <span>0{index + 1}</span>
              <h3>{eventType.title}</h3>
              <p>{eventType.description}</p>
              {eventType.featured && <small>Especialidad Murray</small>}
              <i aria-hidden="true">↗</i>
            </article>
          ))}
        </div>
        <div className="party-events-footer">
          <span>¿Qué estás organizando?</span>
          <a href={whatsappUrl} target="_blank" rel="noreferrer">Contanos tu idea <b>↗</b></a>
        </div>
      </section>

      <section className="party-prelude" aria-labelledby="party-prelude-title" data-party-reveal>
        <div className="party-prelude-portrait">
          <Image src="/djs/micky.jpg" alt="Micky, parte de la familia Murray" fill sizes="(max-width: 800px) 100vw, 45vw" />
        </div>
        <div className="party-prelude-copy">
          <span className="party-kicker">Antes de la primera canción</span>
          <h2 id="party-prelude-title">La fiesta<br />empieza<br /><em>mucho antes.</em></h2>
          <p>La música habla de ustedes. La noche empieza por escucharlos.</p>
          <ol>
            <li><span>01</span><div><h3>Contanos qué imaginás.</h3><p>La fecha, el lugar, los invitados y el motivo para celebrar. Cada fiesta tiene su punto de partida.</p></div></li>
            <li><span>02</span><div><h3>Le damos forma juntos.</h3><p>Definimos la propuesta de DJ, sonido e iluminación. Lo incluido, los opcionales y las condiciones de reserva, claros desde el principio.</p></div></li>
            <li><span>03</span><div><h3>Encontramos su música.</h3><p>Gustos, canciones y momentos especiales. Una selección que conecte con ustedes y con quienes van a compartir la pista.</p></div></li>
          </ol>
          <a href={whatsappUrl} target="_blank" rel="noreferrer">Hablemos de tu fiesta ↗</a>
        </div>
      </section>

      <section className="party-questions" aria-labelledby="party-questions-title" data-party-reveal>
        <header><span className="party-kicker">Antes de encontrarnos</span><h2 id="party-questions-title">Tu fiesta.<br /><em>Todo claro.</em></h2></header>
        <div>
          <details><summary>¿Qué necesitan para presupuestar?</summary><p>Fecha, lugar, tipo de evento y cantidad aproximada de invitados. Si todavía no definiste todo, contanos lo que ya sabés.</p></details>
          <details><summary>¿Quién será el DJ de mi fiesta?</summary><p>La participación del equipo y cualquier set especial se definen en la propuesta. Si querés consultar por Micky u otro integrante, comentanos al escribir.</p></details>
          <details><summary>¿Incluye sonido e iluminación?</summary><p>El alcance depende de la propuesta. El presupuesto detalla los equipos incluidos y los adicionales para que puedas elegir con claridad.</p></details>
          <details><summary>¿Cómo reservo mi fecha?</summary><p>Primero confirmamos disponibilidad y alcance. El presupuesto indica la seña y las condiciones aplicables a tu evento.</p></details>
        </div>
      </section>

      <section className="party-final" id="contacto" data-party-reveal>
        <div className="party-final-stamp">M<br />DJS</div><span className="party-kicker">La próxima puede ser la tuya</span>
        <h2>¿Cuándo es<br />la fiesta?</h2>
        <a href={whatsappUrl} target="_blank" rel="noreferrer" className="party-main-cta">Consultar disponibilidad <span>↗</span></a>
        <footer>
          <span>MURRAY DJS © 2026</span>
          <a href="https://www.instagram.com/murray.djs/" target="_blank" rel="noreferrer">@MURRAY.DJS</a>
          <span>BUENOS AIRES, ARGENTINA</span>
        </footer>
      </section>

      <aside className={`party-soundtrack ${isSoundtrackOpen ? "is-open" : ""}`} aria-label="Música para recorrer la página">
        <button
          type="button"
          className="party-soundtrack-trigger"
          aria-expanded={isSoundtrackOpen}
          onClick={() => setIsSoundtrackOpen((current) => !current)}
        >
          <span aria-hidden="true">♫</span>
          <span>{activeChapter ? `${activeChapter.track} · ${activeChapter.artist}` : "Elegí la música"}</span>
          <i aria-hidden="true">{isSoundtrackOpen ? "↓" : "↑"}</i>
        </button>
        <div className="party-soundtrack-panel">
          <div className="party-soundtrack-heading">
            <div><small>Soundtrack Murray</small><strong>Elegí el clima</strong></div>
            <span>Luego tocá play en Spotify</span>
          </div>
          <div className="party-soundtrack-options">
            {chapters.map((chapter) => (
              <button
                type="button"
                key={chapter.spotifyId}
                className={selectedTrack === chapter.spotifyId ? "is-active" : ""}
                onClick={() => setSelectedTrack(chapter.spotifyId)}
              >
                <small>{chapter.title}</small>
                <strong>{chapter.track}</strong>
              </button>
            ))}
          </div>
          {activeChapter && (
            <iframe
              title={`${activeChapter.track} — ${activeChapter.artist} en Spotify`}
              src={`https://open.spotify.com/embed/track/${activeChapter.spotifyId}?utm_source=generator&theme=0`}
              width="100%"
              height="80"
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            />
          )}
        </div>
      </aside>
    </main>
  );
}
