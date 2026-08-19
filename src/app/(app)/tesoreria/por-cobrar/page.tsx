import Link from "next/link";
import { Currency } from "@prisma/client";
import Decimal from "decimal.js";

import { formatMoney } from "@/lib/money/format";
import { treasurySummary } from "@/server/treasury/summary";
import { requireManagement } from "@/server/auth/authorization";

export default async function ReceivablesPage() {
  await requireManagement();
  const { receivables } = await treasurySummary();
  const pending = receivables.filter((item) => item.pending.gt(0)).sort((a, b) => b.pending.comparedTo(a.pending) || a.quote.eventDate.getTime() - b.quote.eventDate.getTime());
  const byClient = [...new Map(pending.map((item) => [item.client.id, item.client])).values()];
  return <><div className="topbar"><div><div className="eyebrow">Tesorería</div><h1>Por cobrar</h1><p className="muted">Cuenta corriente sobre el total final, incluido IVA.</p></div><Link className="btn btn-secondary" href="/tesoreria">Volver</Link></div>
    {Object.values(Currency).map((currency) => <section key={currency}><div className="section-head"><h2>{currency}</h2><strong>{formatMoney(pending.filter((x) => x.version.currency === currency).reduce((sum, x) => sum.plus(x.pending), new Decimal(0)).toFixed(2), currency)}</strong></div><div className="stack">{byClient.map((client) => { const rows = pending.filter((x) => x.client.id === client.id && x.version.currency === currency); if (!rows.length) return null; const total = rows.reduce((sum, x) => sum.plus(x.pending), new Decimal(0)); return <article className="card" key={`${client.id}-${currency}`}><div className="row space"><h3>{client.name}</h3><strong>{formatMoney(total.toFixed(2), currency)}</strong></div>{rows.map((x) => <div className="total-row" key={x.quote.id}><span>{x.quote.eventDate.toLocaleDateString("es-AR", { timeZone: "UTC" })} · <Link href={x.event ? `/eventos/${x.event.id}` : `/presupuestos/${x.quote.id}`}>{x.event?.number ?? x.quote.number}</Link><small>{x.quote.paymentDueDate ? `Vence ${x.quote.paymentDueDate.toLocaleDateString("es-AR", { timeZone: "UTC" })}` : "Sin vencimiento"} · {x.status}</small></span><span>{formatMoney(x.pending.toFixed(2), currency)}</span></div>)}</article>; })}</div></section>)}
  </>;
}
