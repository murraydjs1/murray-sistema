import Link from "next/link";
import { Currency } from "@prisma/client";

import { formatMoney } from "@/lib/money/format";
import { monthRange } from "@/lib/dates/month";
import { cashFlow } from "@/server/treasury/summary";
import { requireManagement } from "@/server/auth/authorization";

export default async function CashFlowPage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  await requireManagement();
  const params = await searchParams;
  const period = monthRange(params.month);
  const flows = await Promise.all(Object.values(Currency).map(async (currency) => [currency, await cashFlow(period.start, period.end, currency)] as const));
  return <><div className="topbar"><div><div className="eyebrow">Tesorería</div><h1>Flujo de caja</h1><p className="muted">Las transferencias internas se muestran aparte y no inflan entradas ni salidas.</p></div><Link className="btn btn-secondary" href="/tesoreria">Volver</Link></div><form className="card row"><input name="month" type="month" defaultValue={period.value}/><button className="btn btn-primary">Ver período</button></form>{flows.map(([currency, flow]) => <section className="card totals" key={currency}><h2>{period.value} · {currency}</h2><Row label="Saldo inicial" value={formatMoney(flow.opening.toFixed(2), currency)}/><Row label="Entradas externas" value={formatMoney(flow.inflows.toFixed(2), currency)}/><Row label="Salidas externas" value={formatMoney(flow.outflows.neg().toFixed(2), currency)}/><Row label="Saldo final" value={formatMoney(flow.closing.toFixed(2), currency)} final/><p className="muted">Transferencias internas: {flow.period.filter((x) => x.category === "TRANSFER").length} movimientos.</p></section>)}</>;
}
function Row({ label, value, final = false }: { label: string; value: string; final?: boolean }) { return <div className={`total-row ${final ? "total-final" : ""}`}><span>{label}</span><strong>{value}</strong></div>; }
