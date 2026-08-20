"use client";

import { AlertTriangle } from "lucide-react";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <section className="error-state" role="alert">
    <span className="error-state-icon"><AlertTriangle size={22} aria-hidden /></span>
    <div><h1>No pudimos cargar esta pantalla</h1><p>Ocurrió un problema inesperado. Tus datos no se modificaron.</p></div>
    <button className="btn btn-secondary" onClick={reset}>Intentar de nuevo</button>
  </section>;
}
