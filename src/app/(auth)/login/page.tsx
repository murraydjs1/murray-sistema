"use client";

import { useActionState } from "react";
import { login } from "@/app/actions/auth";

export default function LoginPage() {
  const [state, action, pending] = useActionState(login, {});

  return (
    <main className="login">
      <aside className="login-hero" aria-label="Murray DJs en acción">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="login-hero-image" src="/brand/login-hero.png" alt="Murray DJs musicalizando un evento" />
        <div className="login-hero-scrim" />
        <div className="login-message" aria-label="Familia, pasión, música. Desde hace años haciendo de cada evento una noche para recordar.">
          <div className="login-message-title" aria-hidden="true">
            FAMILIA<span>,</span><br />
            PASIÓN<span>,</span><br />
            MÚSICA<span>.</span>
          </div>
          <p>Desde hace años<br />haciendo de cada evento<br />una noche para <span>recordar.</span></p>
        </div>
      </aside>
      <section className="login-panel">
        <div className="login-panel-content">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="login-panel-logo" src="/brand/murray-logo-dark.svg" alt="Murray Disc Jockeys" width={260} height={149} />
        <h1>Gestión de eventos</h1>
        <p className="muted">Ingresá para organizar presupuestos, eventos y equipo.</p>
        <form action={action} className="form login-form">
          {state.error && <div className="error" role="alert">{state.error}</div>}
          <div className="field">
            <label htmlFor="email">Email</label>
            <input id="email" name="email" type="email" autoComplete="email" placeholder="nombre@murraydjs.com" required />
          </div>
          <div className="field">
            <label htmlFor="password">Contraseña</label>
            <input id="password" name="password" type="password" autoComplete="current-password" placeholder="Tu contraseña" required />
          </div>
          <button className="btn btn-primary" disabled={pending}>{pending ? "Ingresando…" : "Ingresar"}</button>
        </form>
        </div>
      </section>
    </main>
  );
}
