import { legacyCollections } from "@/lib/treasury/legacy-collection";
import { EventStatus, Prisma } from "@prisma/client";
import Decimal from "decimal.js";
import Link from "next/link";
import { formatMoney } from "@/lib/money/format";
import { requireOperations } from "@/server/auth/authorization";
import { prisma } from "@/server/db/prisma";
import { humanLabel } from "@/lib/ui/labels";

type SearchParams = { sort?: string; q?: string; status?: string; eliminado?: string };
type EventRow = Prisma.EventGetPayload<{
  include: {
    client: true;
    eventType: true;
    sourceQuoteVersion: true;
    legacyFinancialData: true;
    clientPayments: true;
    managerStaff: true;
    staffAssignments: { where: { active: true }; include: { staff: true } };
    sourceQuote: { include: { payments: { where: { status: "ACTIVE" } } } };
  };
}>;

export default async function Events({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireOperations();
  const params = await searchParams;
  const sort = params.sort === "oldest" ? "oldest" : "newest";
  const selectedStatus = Object.values(EventStatus).includes(params.status as EventStatus) ? params.status as EventStatus : undefined;
  const orderBy = sort === "oldest" ? [{ eventDate: "asc" as const }, { startTime: "asc" as const }] : [{ eventDate: "desc" as const }, { startTime: "asc" as const }];
  const events = await prisma.event.findMany({
    where: {
      status: selectedStatus ?? { not: EventStatus.CANCELADO },
      OR: params.q ? [
        { number: { contains: params.q, mode: "insensitive" } },
        { venue: { contains: params.q, mode: "insensitive" } },
        { client: { name: { contains: params.q, mode: "insensitive" } } },
      ] : undefined,
    },
    include: { client: true, eventType: true, sourceQuoteVersion: true, legacyFinancialData: true, clientPayments: { where: { status: "ACTIVE" } }, managerStaff: true, staffAssignments: { where: { active: true }, include: { staff: true } }, sourceQuote: { include: { payments: { where: { status: "ACTIVE" } } } } },
    orderBy,
  });

  const grouped = groupByMonth(events as EventRow[]);

  return (
    <>
      <div className="topbar">
        <div>
          <div className="eyebrow">Operación</div>
          <h1>Eventos</h1>
        </div>
        <div className="row">
          <Link className="btn btn-secondary" href={`/eventos?${eventQuery({ ...params, sort: sort === "newest" ? "oldest" : "newest" })}`}>
            {sort === "newest" ? "Más antiguos" : "Más recientes"}
          </Link>
          <Link className="btn btn-primary" href="/eventos/nuevo">
            + Nuevo evento
          </Link>
        </div>
      </div>
      {params.eliminado === "1" && <p className="alert" role="status">Evento eliminado. Ya no aparece en la agenda ni en los reportes.</p>}
      <form className="toolbar" method="get">
        <input type="hidden" name="sort" value={sort} />
        <div className="field toolbar-search"><label htmlFor="events-q">Buscar</label><input id="events-q" name="q" defaultValue={params.q || ""} placeholder="Número, cliente o lugar" /></div>
        <div className="field"><label htmlFor="events-status">Estado</label><select id="events-status" name="status" defaultValue={selectedStatus || ""}><option value="">Estados activos</option>{Object.values(EventStatus).map((status) => <option key={status} value={status}>{humanLabel(status)}</option>)}</select></div>
        <button className="btn btn-secondary">Filtrar</button>
        {(params.q || selectedStatus) && <Link className="btn btn-ghost" href={`/eventos?sort=${sort}`}>Limpiar</Link>}
      </form>
      <div className="stack">
        {grouped.map(({ label, rows }) => (
          <section key={label}>
            <div className="section-head">
              <h2>{label}</h2>
            </div>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Evento</th>
                    <th>Cliente</th>
                    <th>Lugar</th>
                    <th>Estado</th>
                    <th>Encargado</th>
                    <th>Cobrado</th>
                    <th>Pendiente</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((event) => {
                    const balances = event.legacyFinancialData ? legacyCollections(event.legacyFinancialData, event.clientPayments) : event.sourceQuoteVersion ? (() => {
                      const { currency, totalFinal } = event.sourceQuoteVersion;
                      const paid = (event.sourceQuote?.payments ?? []).filter(p => p.currency === currency).reduce((sum, p) => sum.plus(p.amount), new Decimal(0));
                      return [{ currency, paid, pending: new Decimal(totalFinal).minus(paid) }];
                    })() : [];
                    const canceled = event.status === EventStatus.CANCELADO;
                    return (
                      <tr key={event.id} className={canceled ? "expense-void" : ""}>
                        <td data-label="Fecha">{event.eventDate.toLocaleDateString("es-AR", { timeZone: "UTC" })}</td>
                        <td data-label="Evento"><Link href={`/eventos/${event.id}`}>{event.number} · {event.eventType.name}</Link></td>
                        <td data-label="Cliente"><span className="cell-primary">{event.client.name}</span><small>{humanLabel(event.client.type)}</small></td>
                        <td data-label="Lugar">{event.venue}<small>{[event.address, event.locality].filter(Boolean).join(", ") || "Sin dirección"}</small></td>
                        <td data-label="Estado"><span className={`badge ${canceled ? "badge-danger" : event.status === "REALIZADO" ? "badge-green" : "badge-brand"}`}>{humanLabel(event.status)}</span></td>
                        <td data-label="Encargado"><span className="cell-primary">{event.managerStaff?.name || "Sin definir"}</span><small>{event.staffAssignments.map((a) => a.staff.name).join(" · ") || "Sin asignar"}</small></td>
                        <td data-label="Cobrado">{balances.map(b => <div key={b.currency}>{formatMoney(b.paid.toFixed(2), b.currency)}</div>)}</td>
                        <td data-label="Pendiente">{balances.map(b => <div key={b.currency}>{b.pending === null ? "Venta sin importe" : formatMoney(Decimal.max(b.pending, 0).toFixed(2), b.currency)}</div>)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        ))}
      </div>
      {!events.length && <div className="card empty"><strong>No encontramos eventos</strong><p>Probá con otra búsqueda o limpiá los filtros para ver todos los registros.</p></div>}
    </>
  );
}

function eventQuery(params: SearchParams) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) if (value && key !== "eliminado") query.set(key, value);
  return query.toString();
}

function groupByMonth(events: EventRow[]) {
  const groups = new Map<string, EventRow[]>();
  for (const event of events) {
    const key = event.eventDate.toLocaleDateString("es-AR", { month: "long", year: "numeric", timeZone: "UTC" });
    const rows = groups.get(key) || [];
    rows.push(event);
    groups.set(key, rows);
  }
  return [...groups.entries()].map(([label, rows]) => ({ label, rows }));
}
