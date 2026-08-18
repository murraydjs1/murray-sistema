"use client";
import { useActionState } from "react";
import { Music2 } from "lucide-react";
import { login } from "@/app/actions/auth";
export default function LoginPage() {
  const [state, action, pending] = useActionState(login, {});
  return <main className="login"><section className="card login-card"><div className="login-brand"><div className="brand-mark"><Music2 /></div><div className="login-brand-copy">MURRAY <span>DJs</span></div></div><h1>Gestión de eventos</h1><p className="muted">Ingresá para organizar presupuestos, eventos y equipo.</p><form action={action} className="form" style={{marginTop:24}}>{state.error&&<div className="error" role="alert">{state.error}</div>}<div className="field"><label htmlFor="email">Email</label><input id="email" name="email" type="email" autoComplete="email" placeholder="nombre@murraydjs.com" required /></div><div className="field"><label htmlFor="password">Contraseña</label><input id="password" name="password" type="password" autoComplete="current-password" placeholder="Tu contraseña" required /></div><button className="btn btn-primary" disabled={pending}>{pending?"Ingresando…":"Ingresar"}</button></form></section></main>;
}
