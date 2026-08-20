import { QuoteStatus } from "@prisma/client";
import Link from "next/link";
import { formatMoney } from "@/lib/money/format";
import { humanLabel } from "@/lib/ui/labels";
import { requireManagement } from "@/server/auth/authorization";
import { prisma } from "@/server/db/prisma";

export default async function Quotes({ searchParams }: { searchParams: Promise<{ q?: string; status?: string }> }) {
  await requireManagement();
  const params = await searchParams;
  const status = Object.values(QuoteStatus).includes(params.status as QuoteStatus) ? params.status as QuoteStatus : undefined;
  const quotes = await prisma.quote.findMany({
    where: {
      status,
      OR: params.q ? [
        { number: { contains: params.q, mode: "insensitive" } },
        { venue: { contains: params.q, mode: "insensitive" } },
        { client: { name: { contains: params.q, mode: "insensitive" } } },
      ] : undefined,
    },
    include: { client: true, eventType: true, versions: { orderBy: { versionNumber: "desc" }, take: 1 } },
    orderBy: { createdAt: "desc" },
  });

  return <>
    <div className="topbar"><div><h1>Presupuestos</h1><p className="muted">Seguimiento comercial desde la consulta hasta la confirmación.</p></div><Link className="btn btn-primary" href="/presupuestos/nuevo">+ Nuevo presupuesto</Link></div>
    <form className="toolbar" method="get">
      <div className="field toolbar-search"><label htmlFor="quotes-q">Buscar</label><input id="quotes-q" name="q" defaultValue={params.q || ""} placeholder="Número, cliente o lugar" /></div>
      <div className="field"><label htmlFor="quotes-status">Estado</label><select id="quotes-status" name="status" defaultValue={status || ""}><option value="">Todos</option>{Object.values(QuoteStatus).map((item) => <option value={item} key={item}>{humanLabel(item)}</option>)}</select></div>
      <button className="btn btn-secondary">Filtrar</button>
      {(params.q || status) && <Link className="btn btn-ghost" href="/presupuestos">Limpiar</Link>}
    </form>
    <div className="table-wrap"><table className="table"><thead><tr><th>Número</th><th>Cliente</th><th>Evento</th><th>Fecha</th><th>Estado</th><th>Total vigente</th></tr></thead><tbody>{quotes.map((quote) => {
      const version = quote.versions[0];
      return <tr key={quote.id}><td data-label="Número"><Link href={`/presupuestos/${quote.id}`}>{quote.number}</Link></td><td data-label="Cliente"><span className="cell-primary">{quote.client.name}</span><small>{quote.venue}</small></td><td data-label="Evento">{quote.eventType.name}</td><td data-label="Fecha">{quote.eventDate.toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" })}</td><td data-label="Estado"><span className={`badge ${quote.status === "CONFIRMADO" ? "badge-green" : quote.status === "CANCELADO" ? "badge-danger" : "badge-brand"}`}>{humanLabel(quote.status)}</span></td><td data-label="Total">{version ? formatMoney(String(version.totalFinal), version.currency) : "Sin versión"}</td></tr>;
    })}</tbody></table></div>
    {!quotes.length && <div className="card empty"><strong>No encontramos presupuestos</strong><p>{params.q || status ? "Probá modificando los filtros." : "Creá el primero para iniciar el seguimiento comercial."}</p></div>}
  </>;
}
