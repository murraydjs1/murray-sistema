import { randomUUID } from "node:crypto";
import Link from "next/link";
import { Currency } from "@prisma/client";
import Decimal from "decimal.js";

import { createClientPayment } from "@/app/actions/treasury";
import { formatMoney } from "@/lib/money/format";
import { requireManagement } from "@/server/auth/authorization";
import { operationalFinanceSummary } from "@/server/finance/operational-summary";

export default async function ReceivablesPage() {
  await requireManagement();
  const { rows } = await operationalFinanceSummary();
  const pending = rows.filter((row) => row.pendingCollection.gt(0));
  return <><div className="topbar"><div><div className="eyebrow">Finanzas operativas</div><h1>Cobros</h1><p className="muted">Registrá señas, pagos parciales y saldos sin necesidad de cargar una cuenta bancaria.</p></div><Link className="btn btn-secondary" href="/tesoreria">Volver a Finanzas</Link></div>
    {Object.values(Currency).map((currency) => { const items = pending.filter((row) => row.version.currency === currency); const total = items.reduce((sum, row) => sum.plus(row.pendingCollection), new Decimal(0)); return <section key={currency}><div className="section-head"><h2>{currency}</h2><strong>{formatMoney(total.toFixed(2), currency)}</strong></div><div className="stack">{items.map((row) => <article className="card finance-detail-card" key={row.event.id}><div className="row space"><div><Link href={`/eventos/${row.event.id}`}><strong>{row.event.number} · {row.event.sourceQuote?.client.name}</strong></Link><p className="muted">{row.event.eventDate.toLocaleDateString("es-AR", { timeZone: "UTC" })} · {row.event.venue}{row.event.sourceQuote?.paymentDueDate ? ` · vence ${row.event.sourceQuote.paymentDueDate.toLocaleDateString("es-AR", { timeZone: "UTC" })}` : ""}</p></div><strong>{formatMoney(row.pendingCollection.toFixed(2), currency)}</strong></div><div className="finance-breakdown"><span>Total {formatMoney(String(row.version.totalFinal), currency)}</span><span>Cobrado {formatMoney(row.collected.toFixed(2), currency)}</span><span>Pendiente {formatMoney(row.pendingCollection.toFixed(2), currency)}</span></div><details><summary>Registrar cobro</summary><form action={createClientPayment} className="form edit-panel"><input type="hidden" name="eventId" value={row.event.id}/><input type="hidden" name="idempotencyKey" value={randomUUID()}/><div className="form-grid"><div className="field"><label>Tipo</label><select name="paymentType"><option value="DEPOSIT">Seña</option><option value="PARTIAL">Pago parcial</option><option value="BALANCE">Saldo</option><option value="OTHER">Otro</option></select></div><div className="field"><label>Importe</label><input name="amount" type="number" min="0.01" max={row.pendingCollection.toFixed(2)} step="0.01" defaultValue={row.pendingCollection.toFixed(2)} required/></div><div className="field"><label>Fecha</label><input name="paymentDate" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required/></div><div className="field"><label>Medio</label><select name="paymentMethod"><option value="TRANSFER">Transferencia</option><option value="CASH">Efectivo</option><option value="MERCADO_PAGO">Mercado Pago</option><option value="OTHER">Otro</option></select></div><div className="field span-2"><label>Nota</label><input name="notes" placeholder="Opcional"/></div></div><button className="btn btn-primary">Registrar cobro</button></form></details></article>)}{!items.length && <div className="card empty">No hay cobros pendientes en {currency}.</div>}</div></section>; })}
  </>;
}
