import { randomUUID } from "node:crypto";
import Link from "next/link";
import { Currency } from "@prisma/client";
import Decimal from "decimal.js";

import { QuickPayment } from "@/components/dashboard/quick-payment";
import { previousWeek } from "@/lib/dashboard/operations";
import { formatMoney } from "@/lib/money/format";
import { requireManagement } from "@/server/auth/authorization";
import { operationalFinanceSummary } from "@/server/finance/operational-summary";

export default async function ReceivablesPage() {
  await requireManagement();
  const { rows } = await operationalFinanceSummary();
  const pending = rows.filter((row) => row.pendingCollection.gt(0));

  return <>
    <div className="topbar"><div><div className="eyebrow">Finanzas operativas</div><h1>Cobros</h1><p className="muted">Señas, pagos parciales y saldos. También se muestran los saldos que vinieron desde Excel.</p></div><Link className="btn btn-secondary" href="/tesoreria">Volver a Finanzas</Link></div>
    {Object.values(Currency).map((currency) => {
      const items = pending.filter((row) => row.currency === currency);
      const total = items.reduce((sum, row) => sum.plus(row.pendingCollection), new Decimal(0));
      return <section key={currency}>
        <div className="section-head"><h2>{currency}</h2><strong>{formatMoney(total.toFixed(2), currency)}</strong></div>
        <div className="stack">{items.map((row) => <article className="card finance-detail-card" key={`${row.event.id}-${currency}`}>
          <div className="row space"><div><Link href={`/eventos/${row.event.id}`}><strong>{row.event.number} · {row.event.client.name}</strong></Link><p className="muted">{row.event.eventDate.toLocaleDateString("es-AR", { timeZone: "UTC" })} · {row.event.venue}{row.paymentDueDate ? ` · vence ${row.paymentDueDate.toLocaleDateString("es-AR", { timeZone: "UTC" })}` : ""}</p></div><strong>{formatMoney(row.pendingCollection.toFixed(2), currency)}</strong></div>
          <div className="finance-breakdown"><span>Total {formatMoney(row.total.toFixed(2), currency)}</span><span>Cobrado {formatMoney(row.collected.toFixed(2), currency)}</span><span>Pendiente {formatMoney(row.pendingCollection.toFixed(2), currency)}</span></div>
          {row.isLegacy && <p className="muted">La seña de Excel ya está incluida. Registrá solo los cobros adicionales.</p>}
          <QuickPayment eventId={row.event.id} currency={currency} date={previousWeek().today.toISOString().slice(0, 10)} operationId={randomUUID()} />
        </article>)}{!items.length && <div className="card empty">No hay cobros pendientes en {currency}.</div>}</div>
      </section>;
    })}
  </>;
}
