import { Currency, EventStatus, Prisma } from "@prisma/client";
import Decimal from "decimal.js";
import Link from "next/link";
import { formatMoney } from "@/lib/money/format";
import { requireManagement } from "@/server/auth/authorization";
import { prisma } from "@/server/db/prisma";

type SearchParams = { sort?: string };
type EventRow = Prisma.EventGetPayload<{
  include: {
    client: true;
    eventType: true;
    sourceQuoteVersion: true;
    legacyFinancialData: true;
    managerStaff: true;
    staffAssignments: { where: { active: true }; include: { staff: true } };
    sourceQuote: { include: { payments: { where: { status: "ACTIVE" } } } };
  };
}>;

export default async function Events({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireManagement();
  const params = await searchParams;
  const sort = params.sort === "oldest" ? "oldest" : "newest";
  const orderBy = sort === "oldest" ? [{ eventDate: "asc" as const }, { startTime: "asc" as const }] : [{ eventDate: "desc" as const }, { startTime: "asc" as const }];
  const events = await prisma.event.findMany({
    where: { status: { not: EventStatus.CANCELADO } },
    include: { client: true, eventType: true, sourceQuoteVersion: true, legacyFinancialData: true, managerStaff: true, staffAssignments: { where: { active: true }, include: { staff: true } }, sourceQuote: { include: { payments: { where: { status: "ACTIVE" } } } } },
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
          <Link className="btn btn-secondary" href={`/eventos?sort=${sort === "newest" ? "oldest" : "newest"}`}>
            {sort === "newest" ? "Más antiguos" : "Más recientes"}
          </Link>
          <Link className="btn btn-primary" href="/eventos/nuevo">
            + Nuevo evento
          </Link>
        </div>
      </div>
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
                    const current = event.sourceQuoteVersion ? event.sourceQuoteVersion.currency : Currency.ARS;
                    const total = event.sourceQuoteVersion ? new Decimal(event.sourceQuoteVersion.totalFinal) : legacyMoney(event.legacyFinancialData);
                    const paid = event.sourceQuote?.payments.reduce((sum: Decimal, payment) => payment.currency === current ? sum.plus(new Decimal(String(payment.amount))) : sum, new Decimal(0)) || new Decimal(0);
                    const pending = Decimal.max(total.minus(paid), 0);
                    const canceled = event.status === EventStatus.CANCELADO;
                    return (
                      <tr key={event.id} className={canceled ? "expense-void" : ""}>
                        <td data-label="Fecha">{event.eventDate.toLocaleDateString("es-AR", { timeZone: "UTC" })}</td>
                        <td data-label="Evento"><Link href={`/eventos/${event.id}`}>{event.number} · {event.eventType.name}</Link></td>
                        <td data-label="Cliente">{event.client.name}<small>{event.client.type}</small></td>
                        <td data-label="Lugar">{event.venue}<small>{[event.address, event.locality].filter(Boolean).join(", ") || "Sin dirección"}</small></td>
                        <td data-label="Estado"><span className={`badge ${canceled ? "badge-danger" : ""}`}>{event.status.replaceAll("_", " ")}</span></td>
                        <td data-label="Encargado">{event.managerStaff?.name || "Sin definir"}<small>{event.staffAssignments.map((a) => a.staff.name).join(" · ") || "Sin asignar"}</small></td>
                        <td data-label="Cobrado">{formatMoney(paid.toFixed(2), current)}</td>
                        <td data-label="Pendiente">{formatMoney(pending.toFixed(2), current)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        ))}
      </div>
      {!events.length && <div className="card empty">Todavía no hay eventos.</div>}
    </>
  );
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

function legacyMoney(value: { saleArs: unknown; saleUsd: unknown } | null) {
  if (!value) return new Decimal(0);
  return new Decimal(String(value.saleArs ?? value.saleUsd ?? 0));
}
