import { randomUUID } from "node:crypto";
import Decimal from "decimal.js";
import Link from "next/link";
import { prisma } from "@/server/db/prisma";
import { requireManagement } from "@/server/auth/authorization";
import { previousWeek, collectionBalance, eventStaffBalances } from "@/lib/dashboard/operations";
import { formatMoney } from "@/lib/money/format";
import { QuickPayment } from "./quick-payment";

const currencies = ["ARS", "USD"] as const;
const dateLabel = (date: Date) => date.toLocaleDateString("es-AR", { timeZone: "UTC" });
export async function OperationsOverview() {
  await requireManagement();
  const { today, start, end } = previousWeek();
  // Read the complete past: a monthly report filter must never hide an older debt.
  const events = await prisma.event.findMany({
    where: { eventDate: { lt: today }, status: { not: "CANCELADO" } },
    orderBy: [{ eventDate: "desc" }, { id: "asc" }],
    include: {
      client: { select: { name: true } }, sourceQuoteVersion: true,
      sourceQuote: { select: { payments: { where: { status: "ACTIVE" } } } },
      legacyFinancialData: true,
      staffAssignments: { where: { active: true }, include: { staff: { select: { name: true } } } },
      staffPayments: { where: { status: "ACTIVE" } },
    },
  });
  const rows = events.map(event => ({ event,
    collection: event.sourceQuoteVersion && event.sourceQuote ? collectionBalance(event.sourceQuoteVersion, event.sourceQuote.payments) : null,
    team: eventStaffBalances(event.staffAssignments, event.staffPayments),
  }));
  const week = rows.filter(({ event }) => event.eventDate >= start && event.eventDate < end);
  const receivables = rows.filter(row => row.collection?.pending.gt(0)).reverse();
  const payables = rows.filter(row => row.team.some(person => person.pending.gt(0))).reverse();
  const unclosed = rows.filter(({ event }) => event.financialStatus !== "CLOSED");
  const historical = rows.filter(row => !row.collection);
  const lastSunday = new Date(end); lastSunday.setUTCDate(lastSunday.getUTCDate() - 1);
  const totalDue = (currency: "ARS" | "USD") => receivables.filter(r => r.event.sourceQuoteVersion?.currency === currency).reduce((sum, r) => sum.plus(r.collection!.pending), new Decimal(0));
  const money = (amount: Decimal, currency: "ARS" | "USD") => formatMoney(amount.toFixed(2), currency);
  type Row = typeof rows[number];
  function EventCard({ row, showTeam = false }: { row: Row; showTeam?: boolean }) {
    const { event, collection, team } = row;
    const version = event.sourceQuoteVersion;
    return <article className="card operations-event" data-event-id={event.id}>
      <div className="row space"><div><h3><Link href={`/eventos/${event.id}`}>{event.client.name}</Link></h3><p className="muted">{dateLabel(event.eventDate)} · {event.number} · {event.venue}</p></div><span className={`badge ${event.financialStatus === "CLOSED" ? "badge-green" : "badge-warn"}`}>{event.financialStatus === "CLOSED" ? "Finanzas cerradas" : "Finanzas por revisar"}</span></div>
      {!["REALIZADO", "CERRADO"].includes(event.status) && <p className="muted">Figura como {event.status.replaceAll("_", " ").toLowerCase()}. Revisá si se realizó.</p>}
      {collection && version ? <>
        <dl className="operations-amounts"><div><dt>Cobrado</dt><dd>{money(collection.paid, version.currency)}</dd></div><div><dt>{collection.pending.lt(0) ? "Saldo a favor del cliente" : "Falta cobrar"}</dt><dd>{money(collection.pending.abs(), version.currency)}</dd></div></dl>
        <QuickPayment eventId={event.id} currency={version.currency} date={today.toISOString().slice(0, 10)} operationId={randomUUID()} />
      </> : <p className="alert">Importado de Excel: cobros por verificar. La seña histórica no confirma el saldo actual. <Link href={`/eventos/${event.id}`}>Revisar datos del evento →</Link></p>}
      {!collection && event.legacyFinancialData && <dl className="operations-amounts">{currencies.map(currency => {
        const legacy = event.legacyFinancialData!;
        const sale = currency === "ARS" ? legacy.saleArs : legacy.saleUsd;
        const deposit = currency === "ARS" ? legacy.depositArs : legacy.depositUsd;
        return sale === null ? null : <div key={currency}><dt>Saldo según Excel · por verificar</dt><dd>{money(Decimal.max(new Decimal(sale).minus(deposit ?? 0), 0), currency)}</dd></div>;
      })}</dl>}
      {showTeam && <div className="operations-team"><h4>Pagos al personal</h4>{team.length ? team.map(person => <div className="operations-person" key={`${person.staffId}-${person.currency}`}>
        <div className="row space"><Link href={`/personal/${person.staffId}`}>{person.name}</Link><strong>{person.pending.gt(0) ? `Falta pagar ${money(person.pending, person.currency)}` : `Pagado · ${person.currency}`}</strong></div>
        <p className="muted">Acordado {money(person.agreed, person.currency)} · Pagado al evento {money(person.paid, person.currency)}</p>
        {person.pending.gt(0) && <><Link className="btn btn-ghost" href={`/personal/liquidaciones/${person.staffId}`}>Revisar adelantos y liquidación</Link><QuickPayment eventId={event.id} staffId={person.staffId} currency={person.currency} date={today.toISOString().slice(0, 10)} operationId={randomUUID()} /></>}
      </div>) : <p className="muted">Sin personal asignado. Completá el equipo y los importes en el evento.</p>}</div>}
      <Link className="btn btn-secondary" href={`/eventos/${event.id}`}>Revisar evento y gastos →</Link>
    </article>;
  }
  function EventList({ items, showTeam = false, expanded = false }: { items: Row[]; showTeam?: boolean; expanded?: boolean }) {
    const render = (row: Row) => expanded ? <EventCard key={row.event.id} row={row} showTeam={showTeam} /> : <details key={row.event.id} className="card operations-compact"><summary><span>{dateLabel(row.event.eventDate)} · {row.event.client.name}<small>{row.event.number} · {row.event.venue}</small></span><strong>{showTeam ? currencies.map(currency => { const pending = row.team.filter(p => p.currency === currency).reduce((sum, p) => sum.plus(p.pending), new Decimal(0)); return pending.gt(0) ? `${money(pending, currency)} por pagar` : null; }).filter(Boolean).join(" · ") : row.collection && row.event.sourceQuoteVersion ? `${money(Decimal.max(row.collection.pending, 0), row.event.sourceQuoteVersion.currency)} por cobrar` : "Cobros por verificar"}</strong></summary><EventCard row={row} showTeam={showTeam} /></details>;
    return <div className="stack">{items.slice(0, 5).map(render)}{items.length > 5 && <details className="card"><summary>Ver los {items.length - 5} eventos restantes</summary><div className="stack">{items.slice(5).map(render)}</div></details>}</div>;
  }
  return <section aria-label="Pendientes de la operación" className="operations-overview">
    <nav className="operations-shortcuts" aria-label="Ir a pendientes">
      <Link className="card" href="#revision-semanal"><span>Semana anterior</span><strong>{week.length} {week.length === 1 ? "evento" : "eventos"}</strong><small>Revisar cobros, personal y gastos →</small></Link>
      <Link className="card" href="#eventos-por-cobrar"><span>Eventos pasados por cobrar · {receivables.length}</span>{currencies.map(c => <strong key={c}>{money(totalDue(c), c)}</strong>)}</Link>
      <Link className="card" href="#personal-por-pagar"><span>Personal pendiente</span><strong>{payables.length} {payables.length === 1 ? "evento" : "eventos"}</strong><small>Pagos asignados al evento →</small></Link>
      <Link className="card" href="#finanzas-por-cerrar"><span>Finanzas por cerrar</span><strong>{unclosed.length} {unclosed.length === 1 ? "evento" : "eventos"}</strong><small>Revisar costos y resultado →</small></Link>
    </nav>
    <section id="revision-semanal"><div className="section-head"><div><div className="eyebrow">Revisión del lunes · lunes a domingo</div><h2>Semana anterior</h2><p className="muted">{dateLabel(start)} al {dateLabel(lastSunday)} · Completá lo cobrado, lo pagado y los gastos.</p></div></div>
      <p className="muted">Personal: se muestran pagos asignados a cada evento. Revisá los adelantos generales en la liquidación antes de pagar.</p>
      {week.length ? <EventList items={week} showTeam expanded /> : <div className="card empty">No hubo eventos no cancelados en la semana anterior.</div>}
    </section>
    <section id="eventos-por-cobrar"><div className="section-head"><div><h2>Eventos pasados por cobrar</h2><p className="muted">De cualquier fecha, del más antiguo al más reciente. Saldo según cobros registrados.</p></div></div>{receivables.length ? <EventList items={receivables} /> : <div className="card empty">No hay saldos pendientes en los eventos con cobros registrados en Murray.</div>}
      {historical.length > 0 && <details className="card"><summary>{historical.length} eventos importados o sin presupuesto: verificar cobros</summary><p className="muted">No se suman como deuda confirmada. Revisá el historial antes de reclamar un saldo.</p><EventList items={historical} /></details>}
    </section>
    <section id="personal-por-pagar"><div className="section-head"><div><h2>Personal pendiente de pago</h2><p className="muted">Importes acordados menos pagos activos del evento. No descuenta adelantos generales.</p></div></div>{payables.length ? <EventList items={payables} showTeam /> : <div className="card empty">No hay importes pendientes en las asignaciones registradas de eventos pasados.</div>}</section>
    <section id="finanzas-por-cerrar"><div className="section-head"><div><h2>Finanzas por cerrar</h2><p className="muted">Revisá personal y gastos. El resultado sigue siendo provisorio hasta el cierre.</p></div></div>{unclosed.length ? <EventList items={unclosed} /> : <div className="card empty">Todos los eventos pasados tienen sus finanzas cerradas.</div>}</section>
  </section>;
}
