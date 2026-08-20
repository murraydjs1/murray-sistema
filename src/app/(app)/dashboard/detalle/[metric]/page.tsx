import { Currency, EventStatus, Prisma } from "@prisma/client";
import Decimal from "decimal.js";
import Link from "next/link";
import { notFound } from "next/navigation";
import { formatMoney } from "@/lib/money/format";
import { calculateEventProfitability } from "@/lib/profitability/event-profitability";
import { requireManagement } from "@/server/auth/authorization";
import { prisma } from "@/server/db/prisma";

type Metric = "eventos" | "cobrado" | "a-cobrar" | "costos" | "ganancia";
type Filters = { from?: string; to?: string; eventTypeId?: string; status?: string; clientId?: string; currency?: string; q?: string };
type DetailRow = { eventId: string; date: Date; number: string; eventName: string; client: string; venue: string; amount: Decimal; currency: Currency; note: string };
type DashboardEvent = Prisma.EventGetPayload<{ include: { client: true; eventType: true; legacyFinancialData: true; sourceQuoteVersion: true; clientPayments: true; staffAssignments: true; expenses: true } }>;

const titles: Record<Metric, { title: string; eyebrow: string; description: string }> = {
  eventos: { title: "Eventos del período", eyebrow: "Detalle", description: "Eventos incluidos por fecha y filtros seleccionados." },
  cobrado: { title: "Cobrado", eyebrow: "Detalle financiero", description: "Pagos activos registrados y señas importadas desde Excel." },
  "a-cobrar": { title: "A cobrar", eyebrow: "Detalle financiero", description: "Saldo pendiente por evento: total vendido menos lo cobrado." },
  costos: { title: "Costos", eyebrow: "Detalle financiero", description: "Personal asignado y gastos activos que forman el costo." },
  ganancia: { title: "Ganancia", eyebrow: "Detalle financiero", description: "Resultado por evento. En eventos nuevos solo suma si la finanza está cerrada; en importados usa el resultado Excel." },
};

export default async function DashboardMetricDetail({ params, searchParams }: { params: Promise<{ metric: string }>; searchParams: Promise<Filters> }) {
  await requireManagement();
  const { metric: rawMetric } = await params;
  if (!isMetric(rawMetric)) notFound();
  const metric = rawMetric;
  const filters = await searchParams;
  const { from, to, selectedCurrency, eventWhere } = buildFilters(filters);
  const events = await prisma.event.findMany({
    where: eventWhere,
    include: {
      client: true,
      eventType: true,
      legacyFinancialData: true,
      sourceQuoteVersion: true,
      clientPayments: { where: { status: "ACTIVE" } },
      staffAssignments: { where: { active: true }, include: { staff: true } },
      expenses: { where: { status: "ACTIVE" }, include: { category: true } },
    },
    orderBy: { eventDate: "desc" },
  });

  const rows = buildRows(metric, events, selectedCurrency);
  const totals = rows.reduce<Record<Currency, Decimal>>((acc, row) => {
    acc[row.currency] = acc[row.currency].plus(row.amount);
    return acc;
  }, { ARS: new Decimal(0), USD: new Decimal(0) });
  const visibleCurrencies = selectedCurrency ? [selectedCurrency] : ([Currency.ARS, Currency.USD] as Currency[]);
  const title = titles[metric];

  return <>
    <div className="topbar"><div><div className="eyebrow">{title.eyebrow}</div><h1>{title.title}</h1><p className="muted">{title.description}</p></div><Link className="btn btn-secondary" href={`/dashboard?${toQuery(filters)}`}>Volver al inicio</Link></div>
    <div className="card row space"><div><strong>Período</strong><p className="muted">{dateLabel(from)} → {dateLabel(to)}</p></div><div className="row">{visibleCurrencies.map((currency) => <strong key={currency}>{formatMoney(totals[currency].toFixed(2), currency)}</strong>)}</div></div>
    <div className="stack">
      {rows.map((row, index) => <Link className="card card-interactive movement-card" href={`/eventos/${row.eventId}`} key={`${row.eventId}-${row.note}-${index}`}>
        <div><strong>{dateLabel(row.date)} · {row.number} · {row.eventName}</strong><div className="muted">{row.client} · {row.venue || "Sin lugar"} · {row.note}</div></div>
        <strong>{formatMoney(row.amount.toFixed(2), row.currency)}</strong>
      </Link>)}
      {rows.length === 0 && <div className="card empty"><strong>Sin movimientos para este detalle</strong><p>No hay eventos o importes que compongan esta tarjeta con los filtros actuales.</p></div>}
    </div>
  </>;
}

function buildRows(metric: Metric, events: DashboardEvent[], selectedCurrency?: Currency): DetailRow[] {
  const rows: DetailRow[] = [];
  for (const event of events) {
    if (metric === "eventos") {
      rows.push(baseRow(event, new Decimal(1), Currency.ARS, event.status.replaceAll("_", " ")));
      continue;
    }
    const legacy = event.legacyFinancialData;
    if (legacy) {
      const values = {
        ARS: { sale: legacy.saleArs, deposit: legacy.depositArs, cost: legacy.costArs, result: legacy.resultArs },
        USD: { sale: legacy.saleUsd, deposit: legacy.depositUsd, cost: legacy.costUsd, result: legacy.resultUsd },
      };
      for (const currency of Object.values(Currency)) {
        if (selectedCurrency && selectedCurrency !== currency) continue;
        const sale = new Decimal(values[currency].sale ?? 0);
        const deposit = new Decimal(values[currency].deposit ?? 0);
        const cost = new Decimal(values[currency].cost ?? 0);
        const result = new Decimal(values[currency].result ?? 0);
        if (metric === "cobrado" && deposit.gt(0)) rows.push(baseRow(event, deposit, currency, "Seña/cobro importado"));
        if (metric === "a-cobrar" && sale.minus(deposit).gt(0)) rows.push(baseRow(event, sale.minus(deposit), currency, "Pendiente importado"));
        if (metric === "costos" && cost.gt(0)) rows.push(baseRow(event, cost, currency, "Costo importado"));
        if (metric === "ganancia" && !result.eq(0)) rows.push(baseRow(event, result, currency, "Resultado importado"));
      }
      continue;
    }
    const version = event.sourceQuoteVersion;
    if (!version) continue;
    const currency = version.currency as Currency;
    if (selectedCurrency && selectedCurrency !== currency) continue;
    const paid = event.clientPayments.filter((payment) => payment.currency === currency).reduce((sum, payment) => sum.plus(payment.amount), new Decimal(0));
    const total = new Decimal(version.totalFinal);
    if (metric === "cobrado" && paid.gt(0)) rows.push(baseRow(event, paid, currency, "Cobros activos"));
    if (metric === "a-cobrar" && total.minus(paid).gt(0)) rows.push(baseRow(event, total.minus(paid), currency, "Total menos cobrado"));
    if (metric === "costos") {
      const result = calculateEventProfitability({ version, assignments: event.staffAssignments, expenses: event.expenses }).byCurrency[currency];
      const cost = result.staffCost.plus(result.directExpenses);
      if (cost.gt(0)) rows.push(baseRow(event, cost, currency, `Personal ${formatMoney(result.staffCost.toFixed(2), currency)} · Gastos ${formatMoney(result.directExpenses.toFixed(2), currency)}`));
    }
    if (metric === "ganancia" && event.financialStatus === "CLOSED") {
      const result = calculateEventProfitability({ version, assignments: event.staffAssignments, expenses: event.expenses }).byCurrency[currency];
      if (!result.result.eq(0)) rows.push(baseRow(event, result.result, currency, "Resultado cerrado"));
    }
  }
  return rows.sort((a, b) => b.date.getTime() - a.date.getTime());
}

function buildFilters(filters: Filters) {
  const now = new Date();
  const from = filters.from || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const lastDay = new Date(Date.UTC(now.getFullYear(), now.getMonth() + 1, 0)).getUTCDate();
  const to = filters.to || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${lastDay}`;
  const selectedCurrency = Object.values(Currency).includes(filters.currency as Currency) ? filters.currency as Currency : undefined;
  const selectedStatus = Object.values(EventStatus).includes(filters.status as EventStatus) ? filters.status as EventStatus : undefined;
  const eventWhere: Prisma.EventWhereInput = { eventDate: { gte: new Date(`${from}T00:00:00.000Z`), lte: new Date(`${to}T00:00:00.000Z`) }, eventTypeId: filters.eventTypeId || undefined, clientId: filters.clientId || undefined, status: selectedStatus, OR: filters.q ? [{ number: { contains: filters.q, mode: "insensitive" } }, { venue: { contains: filters.q, mode: "insensitive" } }, { client: { name: { contains: filters.q, mode: "insensitive" } } }] : undefined };
  return { from: new Date(`${from}T00:00:00.000Z`), to: new Date(`${to}T00:00:00.000Z`), selectedCurrency, eventWhere };
}

function baseRow(event: DashboardEvent, amount: Decimal, currency: Currency, note: string): DetailRow {
  return { eventId: event.id, date: event.eventDate, number: event.number, eventName: event.eventType?.name || "Evento", client: event.client?.name || "Sin cliente", venue: event.venue, amount, currency, note };
}
function isMetric(value: string): value is Metric { return ["eventos", "cobrado", "a-cobrar", "costos", "ganancia"].includes(value); }
function dateLabel(date: Date) { return date.toLocaleDateString("es-AR", { timeZone: "UTC" }); }
function toQuery(filters: Filters) { const q = new URLSearchParams(); for (const [key, value] of Object.entries(filters)) if (value) q.set(key, value); return q.toString(); }
