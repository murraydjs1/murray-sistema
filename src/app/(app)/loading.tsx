export default function Loading() {
  return <div className="page-loading" role="status" aria-label="Cargando contenido">
    <div className="skeleton skeleton-title" />
    <div className="skeleton skeleton-toolbar" />
    <div className="skeleton-grid">
      {Array.from({ length: 4 }, (_, index) => <div className="skeleton skeleton-card" key={index} />)}
    </div>
    <span className="sr-only">Cargando…</span>
  </div>;
}
