import { Currency, EventStatus, Prisma } from "@prisma/client";
import Decimal from "decimal.js";
import { ArrowRight, CalendarDays, CircleDollarSign, Clock3, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { humanLabel } from "@/lib/ui/labels";
import { formatMoney } from "@/lib/money/format";
import { calculateEventProfitability } from "@/lib/profitability/event-profitability";
import { requireManagement } from "@/server/auth/authorization";
import { prisma } from "@/server/db/prisma";

type Filters = { from?: string; to?: string; eventTypeId?: string; status?: string; clientId?: string; currency?: string; q?: string };
type MoneyTotals = Record<Currency, Decimal>;
type ChartItem = { label: string; value: number; display?: string; tone?: "brand" | "success" | "warning" | "muted" };
const emptyMoney = (): MoneyTotals => ({ ARS: new Decimal(0), USD: new Decimal(0) });

export default async function Dashboard({ searchParams }: { searchParams: Promise<Filters> }) {
  await requireManagement();
  const filters = await searchParams;
  const now = new Date();
  const from = filters.from || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const lastDay = new Date(Date.UTC(now.getFullYear(), now.getMonth() + 1, 0)).getUTCDate();
  const to = filters.to || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${lastDay}`;
  const selectedCurrency = Object.values(Currency).includes(filters.currency as Currency) ? filters.currency as Currency : Currency.ARS;
  const selectedStatus = Object.values(EventStatus).includes(filters.status as EventStatus) ? filters.status as EventStatus : undefined;
  const eventWhere: Prisma.EventWhereInput = {
    eventDate: { gte: new Date(`${from}T00:00:00.000Z`), lte: new Date(`${to}T00:00:00.000Z`) },
    eventTypeId: filters.eventTypeId || undefined,
    clientId: filters.clientId || undefined,
    status: selectedStatus,
    OR: filters.q ? [
      { number: { contains: filters.q, mode: "insensitive" } },
      { venue: { contains: filters.q, mode: "insensitive" } },
      { client: { name: { contains: filters.q, mode: "insensitive" } } },
    ] : undefined,
  };

  // Sequential reads keep the shared Supabase pool stable.
  const events = await prisma.event.findMany({ where: eventWhere, include: { legacyFinancialData: true, sourceQuoteVersion: true, clientPayments: { where: { status: "ACTIVE" } }, staffAssignments: { where: { active: true } }, expenses: { where: { status: "ACTIVE" } } } });
  const eventTypes = await prisma.eventType.findMany({ where: { active: true }, orderBy: { name: "asc" } });
  const clients = await prisma.client.findMany({ where: { active: true }, orderBy: { name: "asc" }, select: { id: true, name: true } });
  const trendStart = new Date(Date.UTC(now.getFullYear(), now.getMonth() - 2, 1));
  const trendEnd = new Date(Date.UTC(now.getFullYear(), now.getMonth() + 4, 1));
  const trendEvents = await prisma.event.findMany({ where: { eventDate: { gte: trendStart, lt: trendEnd }, status: { not: "CANCELADO" } }, select: { eventDate: true } });
  const upcoming = await prisma.event.findMany({
    where: { eventDate: { gte: new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())) }, status: { not: "CANCELADO" } },
    include: { client: true, eventType: true, managerStaff: true },
    orderBy: [{ eventDate: "asc" }, { startTime: "asc" }],
    take: 6,
  });

  const collected = emptyMoney(); const receivable = emptyMoney(); const costs = emptyMoney(); const profit = emptyMoney();
  const operational = { confirmed: 0, realized: 0, readyToClose: 0, closed: 0 };
  for (const event of events) {
    if (event.status === "CONFIRMADO") operational.confirmed += 1;
    if (event.status === "REALIZADO") operational.realized += 1;
    if (event.financialStatus === "READY_TO_CLOSE") operational.readyToClose += 1;
    if (event.financialStatus === "CLOSED") operational.closed += 1;
    const legacy = event.legacyFinancialData;
    if (legacy) {
      const values = { ARS: { sale: legacy.saleArs, deposit: legacy.depositArs, cost: legacy.costArs, result: legacy.resultArs }, USD: { sale: legacy.saleUsd, deposit: legacy.depositUsd, cost: legacy.costUsd, result: legacy.resultUsd } };
      for (const currency of Object.values(Currency)) {
        const sale = new Decimal(values[currency].sale ?? 0); const deposit = new Decimal(values[currency].deposit ?? 0);
        collected[currency] = collected[currency].plus(deposit); receivable[currency] = receivable[currency].plus(Decimal.max(sale.minus(deposit), 0));
        costs[currency] = costs[currency].plus(values[currency].cost ?? 0); profit[currency] = profit[currency].plus(values[currency].result ?? 0);
      }
      continue;
    }
    const version = event.sourceQuoteVersion; if (!version) continue;
    const currency = version.currency;
    const paid = event.clientPayments.filter((payment) => payment.currency === currency).reduce((sum, payment) => sum.plus(payment.amount), new Decimal(0));
    collected[currency] = collected[currency].plus(paid); receivable[currency] = receivable[currency].plus(Decimal.max(new Decimal(version.totalFinal).minus(paid), 0));
    const result = calculateEventProfitability({ version, assignments: event.staffAssignments, expenses: event.expenses }).byCurrency[currency];
    costs[currency] = costs[currency].plus(result.staffCost).plus(result.directExpenses);
    if (event.financialStatus === "CLOSED") profit[currency] = profit[currency].plus(result.result);
  }

  const statusItems = Object.values(EventStatus).map((status) => ({ label: humanLabel(status), value: events.filter((event) => event.status === status).length })).filter((item) => item.value > 0);
  const typeItems = eventTypes.map((type) => ({ label: type.name, value: events.filter((event) => event.eventTypeId === type.id).length })).filter((item) => item.value > 0).sort((a, b) => b.value - a.value).slice(0, 6);
  const financialItems: ChartItem[] = [
    { label: "Cobrado", value: collected[selectedCurrency].toNumber(), display: formatMoney(collected[selectedCurrency].toFixed(2), selectedCurrency), tone: "success" },
    { label: "A cobrar", value: receivable[selectedCurrency].toNumber(), display: formatMoney(receivable[selectedCurrency].toFixed(2), selectedCurrency), tone: "brand" },
    { label: "Costos", value: costs[selectedCurrency].toNumber(), display: formatMoney(costs[selectedCurrency].toFixed(2), selectedCurrency), tone: "warning" },
    { label: "Resultado cerrado", value: profit[selectedCurrency].toNumber(), display: formatMoney(profit[selectedCurrency].toFixed(2), selectedCurrency), tone: "muted" },
  ];
  const monthItems = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(Date.UTC(now.getFullYear(), now.getMonth() - 2 + index, 1));
    return { label: date.toLocaleDateString("es-AR", { month: "short", timeZone: "UTC" }).replace(".", ""), value: trendEvents.filter((event) => event.eventDate.getUTCFullYear() === date.getUTCFullYear() && event.eventDate.getUTCMonth() === date.getUTCMonth()).length };
  });
  const attentionCount = upcoming.filter((event) => !event.managerStaffId || !event.address).length + operational.readyToClose;

  return <>
    <div className="topbar dashboard-heading">
      <div><div className="eyebrow">Visión general</div><h1>Panel de gestión</h1><p className="muted">Actividad, caja y próximos compromisos en un solo lugar.</p></div>
      <div className="row"><Link className="btn btn-secondary" href="/presupuestos/nuevo">Nuevo presupuesto</Link><Link className="btn btn-primary" href="/eventos/nuevo">+ Nuevo evento</Link></div>
    </div>
    <details className="filters dashboard-filters"><summary>Período y filtros</summary><form method="get" className="filter-grid">
      <div className="field"><label htmlFor="filter-from">Desde</label><input id="filter-from" name="from" type="date" defaultValue={from} /></div>
      <div className="field"><label htmlFor="filter-to">Hasta</label><input id="filter-to" name="to" type="date" defaultValue={to} /></div>
      <div className="field"><label htmlFor="filter-type">Tipo de evento</label><select id="filter-type" name="eventTypeId" defaultValue={filters.eventTypeId || ""}><option value="">Todos</option>{eventTypes.map((type) => <option key={type.id} value={type.id}>{type.name}</option>)}</select></div>
      <div className="field"><label htmlFor="filter-status">Estado</label><select id="filter-status" name="status" defaultValue={filters.status || ""}><option value="">Todos</option>{Object.values(EventStatus).map((status) => <option key={status} value={status}>{humanLabel(status)}</option>)}</select></div>
      <div className="field"><label htmlFor="filter-client">Cliente</label><select id="filter-client" name="clientId" defaultValue={filters.clientId || ""}><option value="">Todos</option>{clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}</select></div>
      <div className="field"><label htmlFor="filter-currency">Moneda</label><select id="filter-currency" name="currency" defaultValue={selectedCurrency}><option>ARS</option><option>USD</option></select></div>
      <div className="field filter-search"><label htmlFor="filter-q">Buscar</label><input id="filter-q" name="q" defaultValue={filters.q || ""} placeholder="Número, cliente o lugar" /></div>
      <div className="filter-actions"><button className="btn btn-primary">Aplicar</button><Link className="btn btn-ghost" href="/dashboard">Limpiar</Link></div>
    </form></details>

    <section className="dashboard-kpis">
      <Kpi icon={<CalendarDays size={18} />} label="Eventos del período" value={String(events.length)} href={`/dashboard/detalle/eventos?${toQuery({ ...filters, from, to })}`} />
      <Kpi icon={<Clock3 size={18} />} label="Confirmados" value={String(operational.confirmed)} detail={`${operational.realized} realizados`} href="/eventos" />
      <Kpi icon={<CircleDollarSign size={18} />} label={`Cobrado · ${selectedCurrency}`} value={formatMoney(collected[selectedCurrency].toFixed(2), selectedCurrency)} detail={`${formatMoney(receivable[selectedCurrency].toFixed(2), selectedCurrency)} pendiente`} href={`/dashboard/detalle/cobrado?${toQuery({ ...filters, from, to })}`} />
      <Kpi icon={<TriangleAlert size={18} />} label="Requieren atención" value={String(attentionCount)} detail={`${operational.readyToClose} listos para cerrar`} href="/eventos" tone={attentionCount ? "warning" : undefined} />
    </section>

    <section className="dashboard-analytics">
      <ChartPanel title="Ritmo de eventos" description="Tres meses anteriores y tres próximos." className="chart-wide"><ColumnChart items={monthItems} /></ChartPanel>
      <ChartPanel title="Estados del período" description={`${events.length} eventos filtrados.`}><DonutChart items={statusItems} total={events.length} /></ChartPanel>
      <ChartPanel title={`Composición financiera · ${selectedCurrency}`} description="Comparación sin conversión de moneda." className="chart-wide"><HorizontalChart items={financialItems} /></ChartPanel>
      <ChartPanel title="Tipos de evento" description="Distribución del período seleccionado."><HorizontalChart items={typeItems} compact /></ChartPanel>
    </section>

    <section className="dashboard-bottom">
      <div className="panel-section">
        <div className="panel-heading"><div><h2>Próximos eventos</h2><p>Los seis compromisos más cercanos.</p></div><Link href="/agenda">Ver agenda <ArrowRight size={15} /></Link></div>
        <div className="upcoming-list">{upcoming.map((event) => <Link className="upcoming-row" href={`/eventos/${event.id}`} key={event.id}>
          <time><strong>{event.eventDate.toLocaleDateString("es-AR", { day: "2-digit", timeZone: "UTC" })}</strong><span>{event.eventDate.toLocaleDateString("es-AR", { month: "short", timeZone: "UTC" }).replace(".", "")}</span></time>
          <div><strong>{event.client.name}</strong><span>{event.eventType.name} · {event.startTime} · {event.venue}</span></div>
          <span className={`badge ${event.managerStaff ? "badge-green" : "badge-warn"}`}>{event.managerStaff?.name || "Sin encargado"}</span>
          <ArrowRight size={16} aria-hidden />
        </Link>)}{!upcoming.length && <div className="empty-inline">No hay eventos próximos cargados.</div>}</div>
      </div>
      <div className="panel-section quick-actions">
        <div className="panel-heading"><div><h2>Accesos rápidos</h2><p>Tareas frecuentes del equipo.</p></div></div>
        <Link href="/clientes/nuevo"><span>01</span><div><strong>Nuevo cliente</strong><small>Registrar contacto y datos comerciales</small></div><ArrowRight size={16} /></Link>
        <Link href="/personal/liquidaciones"><span>02</span><div><strong>Liquidaciones</strong><small>Revisar pagos y obligaciones del personal</small></div><ArrowRight size={16} /></Link>
        <Link href="/tesoreria"><span>03</span><div><strong>Tesorería</strong><small>Controlar caja, cobros y pagos</small></div><ArrowRight size={16} /></Link>
      </div>
    </section>
  </>;
}

function Kpi({ icon, label, value, detail, href, tone }: { icon: React.ReactNode; label: string; value: string; detail?: string; href: string; tone?: "warning" }) {
  return <Link href={href} className={`dashboard-kpi${tone ? ` dashboard-kpi-${tone}` : ""}`}><span className="kpi-icon">{icon}</span><div><span>{label}</span><strong>{value}</strong>{detail && <small>{detail}</small>}</div><ArrowRight className="kpi-arrow" size={16} aria-hidden /></Link>;
}
function ChartPanel({ title, description, className = "", children }: { title: string; description: string; className?: string; children: React.ReactNode }) {
  return <section className={`chart-panel ${className}`}><div className="chart-heading"><h2>{title}</h2><p>{description}</p></div>{children}</section>;
}
function ColumnChart({ items }: { items: ChartItem[] }) {
  const max = Math.max(...items.map((item) => item.value), 1);
  return <div className="column-chart" aria-label={items.map((item) => `${item.label}: ${item.value}`).join(", ")}>{items.map((item) => <div className="column-item" key={item.label}><span className="column-value">{item.value}</span><div className="column-track"><i style={{ height: `${Math.max(item.value ? 10 : 2, (item.value / max) * 100)}%` }} /></div><span>{item.label}</span></div>)}</div>;
}
function HorizontalChart({ items, compact = false }: { items: ChartItem[]; compact?: boolean }) {
  const max = Math.max(...items.map((item) => Math.abs(item.value)), 1);
  return <div className={`horizontal-chart${compact ? " horizontal-chart-compact" : ""}`}>{items.length ? items.map((item) => <div className="horizontal-item" key={item.label}><div><span>{item.label}</span><strong>{item.display ?? item.value}</strong></div><div className="bar-track"><i className={`bar-${item.tone ?? "brand"}`} style={{ width: `${Math.max(item.value ? 4 : 0, (Math.abs(item.value) / max) * 100)}%` }} /></div></div>) : <div className="empty-inline">Sin datos para el período.</div>}</div>;
}
function DonutChart({ items, total }: { items: ChartItem[]; total: number }) {
  const colors = ["#ff3035", "#5c6970", "#35b779", "#d7a53a", "#8a6df1", "#de6f42"];
  let cursor = 0;
  const stops = items.map((item, index) => { const start = cursor; cursor += total ? (item.value / total) * 100 : 0; return `${colors[index % colors.length]} ${start}% ${cursor}%`; }).join(", ");
  return <div className="donut-layout"><div className="donut" style={{ background: total ? `conic-gradient(${stops})` : "var(--surface-subtle)" }}><div><strong>{total}</strong><span>Total</span></div></div><div className="donut-legend">{items.map((item, index) => <div key={item.label}><i style={{ background: colors[index % colors.length] }} /><span>{item.label}</span><strong>{item.value}</strong></div>)}{!items.length && <span className="muted">Sin eventos</span>}</div></div>;
}
function toQuery(filters: Filters) { const query = new URLSearchParams(); for (const [key, value] of Object.entries(filters)) if (value) query.set(key, value); return query.toString(); }
