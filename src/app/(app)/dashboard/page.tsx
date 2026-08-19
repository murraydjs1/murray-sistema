import { Currency, EventStatus, Prisma } from "@prisma/client";
import Decimal from "decimal.js";
import Link from "next/link";
import { formatMoney } from "@/lib/money/format";
import { calculateEventProfitability } from "@/lib/profitability/event-profitability";
import { requireManagement } from "@/server/auth/authorization";
import { prisma } from "@/server/db/prisma";

type Filters = { from?: string; to?: string; eventTypeId?: string; status?: string; clientId?: string; currency?: string; q?: string };
type MoneyTotals = Record<Currency, Decimal>;
const emptyMoney = (): MoneyTotals => ({ ARS: new Decimal(0), USD: new Decimal(0) });

export default async function Dashboard({ searchParams }: { searchParams: Promise<Filters> }) {
  await requireManagement();
  const filters = await searchParams;
  const now = new Date();
  const from = filters.from || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const lastDay = new Date(Date.UTC(now.getFullYear(), now.getMonth() + 1, 0)).getUTCDate();
  const to = filters.to || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${lastDay}`;
  const selectedCurrency = Object.values(Currency).includes(filters.currency as Currency) ? filters.currency as Currency : undefined;
  const selectedStatus = Object.values(EventStatus).includes(filters.status as EventStatus) ? filters.status as EventStatus : undefined;
  const eventWhere: Prisma.EventWhereInput = { eventDate: { gte: new Date(`${from}T00:00:00.000Z`), lte: new Date(`${to}T00:00:00.000Z`) }, eventTypeId: filters.eventTypeId || undefined, clientId: filters.clientId || undefined, status: selectedStatus, OR: filters.q ? [{ number: { contains: filters.q, mode: "insensitive" } }, { venue: { contains: filters.q, mode: "insensitive" } }, { client: { name: { contains: filters.q, mode: "insensitive" } } }] : undefined };

  // Sequential reads avoid exhausting the Supabase session pool in production.
  const events = await prisma.event.findMany({ where: eventWhere, include: { legacyFinancialData: true, sourceQuoteVersion: true, clientPayments: { where: { status: "ACTIVE" } }, staffAssignments: { where: { active: true } }, expenses: { where: { status: "ACTIVE" } } } });
  const eventTypes = await prisma.eventType.findMany({ where: { active: true }, orderBy: { name: "asc" } });
  const clients = await prisma.client.findMany({ where: { active: true }, orderBy: { name: "asc" }, select: { id: true, name: true } });
  const collected = emptyMoney(); const receivable = emptyMoney(); const costs = emptyMoney(); const profit = emptyMoney();

  for (const event of events) {
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

  const currencies = selectedCurrency ? [selectedCurrency] : Object.values(Currency);
  return <>
    <div className="topbar"><div><div className="eyebrow">Dashboard</div><h1>Resumen del período</h1></div><Link className="btn btn-accent" href="/presupuestos/nuevo">+ Presupuesto</Link></div>
    <details className="card filters"><summary>Filtrar período</summary><form method="get" className="filter-grid">
      <div className="field"><label htmlFor="filter-from">Desde</label><input id="filter-from" name="from" type="date" defaultValue={from} /></div><div className="field"><label htmlFor="filter-to">Hasta</label><input id="filter-to" name="to" type="date" defaultValue={to} /></div>
      <div className="field"><label htmlFor="filter-type">Tipo de evento</label><select id="filter-type" name="eventTypeId" defaultValue={filters.eventTypeId || ""}><option value="">Todos</option>{eventTypes.map((type) => <option key={type.id} value={type.id}>{type.name}</option>)}</select></div>
      <div className="field"><label htmlFor="filter-status">Estado</label><select id="filter-status" name="status" defaultValue={filters.status || ""}><option value="">Todos</option>{Object.values(EventStatus).map((status) => <option key={status} value={status}>{status.replaceAll("_", " ")}</option>)}</select></div>
      <div className="field"><label htmlFor="filter-client">Cliente</label><select id="filter-client" name="clientId" defaultValue={filters.clientId || ""}><option value="">Todos</option>{clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}</select></div>
      <div className="field"><label htmlFor="filter-currency">Moneda</label><select id="filter-currency" name="currency" defaultValue={filters.currency || ""}><option value="">Todas</option><option>ARS</option><option>USD</option></select></div>
      <div className="field filter-search"><label htmlFor="filter-q">Buscar</label><input id="filter-q" name="q" defaultValue={filters.q || ""} placeholder="Número, cliente o lugar" /></div><div className="filter-actions"><button className="btn btn-primary">Aplicar filtros</button><Link className="btn btn-secondary" href="/dashboard">Limpiar</Link></div>
    </form></details>
    <section className="dashboard-overview"><OverviewCard href="/agenda" label="Eventos del período" value={String(events.length)} detail="Ver agenda" /><MoneyCard href="/tesoreria/movimientos" label="Cobrado" totals={collected} currencies={currencies} detail="Ver cobros" /><MoneyCard href="/tesoreria/por-cobrar" label="A cobrar" totals={receivable} currencies={currencies} detail="Ver cuentas" /><MoneyCard href="/gastos" label="Costos" totals={costs} currencies={currencies} detail="Ver gastos" /><MoneyCard href="/reportes/rentabilidad" label="Ganancia" totals={profit} currencies={currencies} detail="Ver rentabilidad" tone="result" /></section>
  </>;
}

function MoneyCard({ href, label, totals, currencies, detail, tone }: { href: string; label: string; totals: MoneyTotals; currencies: Currency[]; detail: string; tone?: "result" }) { return <Link href={href} className={`card dashboard-card${tone ? " dashboard-card-result" : ""}`}><span>{label}</span><div className="dashboard-values">{currencies.map((currency) => <strong key={currency}>{formatMoney(totals[currency].toFixed(2), currency)}</strong>)}</div><small>{detail} →</small></Link>; }
function OverviewCard({ href, label, value, detail }: { href: string; label: string; value: string; detail: string }) { return <Link href={href} className="card dashboard-card"><span>{label}</span><div className="dashboard-values"><strong>{value}</strong></div><small>{detail} →</small></Link>; }
