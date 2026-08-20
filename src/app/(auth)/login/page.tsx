"use client";

import { useActionState } from "react";
import { login } from "@/app/actions/auth";

export default function LoginPage() {
  const [state, action, pending] = useActionState(login, {});

  return (
    <main className="login">
      <section className="card login-card">
        <div style={{ display: "flex", justifyContent: "center", margin: "-8px 0 8px" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/murray-logo-dark.svg"
            alt="Murray Disc Jockeys"
            width={260}
            height={149}
            style={{ width: "min(260px, 100%)", height: "auto" }}
          />
        </div>
        <h1>Gestión de eventos</h1>
        <p className="muted">Ingresá para organizar presupuestos, eventos y equipo.</p>
        <form action={action} className="form" style={{ marginTop: 24 }}>
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
      </section>
    </main>
  );
}
