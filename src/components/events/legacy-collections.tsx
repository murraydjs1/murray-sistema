import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { requireManagement } from "@/server/auth/authorization";
import { legacyCollections } from "@/lib/treasury/legacy-collection";
import { previousWeek } from "@/lib/dashboard/operations";
import { formatMoney } from "@/lib/money/format";
import { QuickPayment } from "@/components/dashboard/quick-payment";
import { voidClientPayment } from "@/app/actions/treasury";

type Event = Prisma.EventGetPayload<{ include: { legacyFinancialData: true; clientPayments: true } }>;
const methods = { TRANSFER: "Transferencia", CASH: "Efectivo", MERCADO_PAGO: "Mercado Pago", OTHER: "Otro" };

export async function LegacyCollections({ event }: { event: Event }) {
  await requireManagement();
  if (!event.legacyFinancialData) return null;
  const rows = legacyCollections(event.legacyFinancialData, event.clientPayments);
  const today = previousWeek().today.toISOString().slice(0, 10);
  return <section aria-label="Cobros del evento importado" id="cobros" className="stack">
    <div className="section-head"><div><h2>Cobros del cliente</h2><p className="muted">La seña de Excel ya está incluida. Registrá solo los cobros adicionales, sin volver a cargar esa seña.</p></div></div>
    {rows.map(row => <div className="card stack" key={row.currency}>
      <h3>{row.currency}</h3>
      <dl className="operations-amounts">
        <div><dt>Venta de Excel</dt><dd>{row.total === null ? "Sin importe" : formatMoney(row.total.toFixed(2), row.currency)}</dd></div>
        <div><dt>Seña de Excel</dt><dd>{formatMoney(row.deposit.toFixed(2), row.currency)}</dd></div>
        <div><dt>Cobros adicionales</dt><dd>{formatMoney(row.recorded.toFixed(2), row.currency)}</dd></div>
        <div><dt>{row.pending?.lt(0) ? "Saldo a favor del cliente" : "Falta cobrar"}</dt><dd>{row.pending === null ? "Completar venta de Excel" : formatMoney(row.pending.abs().toFixed(2), row.currency)}</dd></div>
      </dl>
      <QuickPayment eventId={event.id} currency={row.currency} date={today} operationId={randomUUID()} />
    </div>)}
    {!rows.length && <p className="alert">Completá la venta en “Editar evento importado” para calcular el saldo.</p>}
    <h3>Historial de cobros adicionales</h3>
    <div className="stack">{event.clientPayments.map(payment => <article className={`card ${payment.status === "VOID" ? "expense-void" : ""}`} key={payment.id}>
      <div className="row space"><div><strong>{payment.paymentDate.toLocaleDateString("es-AR", { timeZone: "UTC" })} · {methods[payment.paymentMethod]}</strong><p>{payment.notes}</p></div><strong>{formatMoney(payment.amount.toFixed(2), payment.currency)}</strong></div>
      {payment.status === "VOID" ? <p>Anulado · {payment.voidReason}</p> : <details><summary>Anular cobro</summary><form action={voidClientPayment.bind(null, payment.id)} className="form edit-panel">
        <div className="field"><label htmlFor={`void-${payment.id}`}>Motivo de anulación</label><input id={`void-${payment.id}`} name="voidReason" required /></div><button className="btn btn-danger">Confirmar anulación</button>
      </form></details>}
    </article>)}{!event.clientPayments.length && <p className="muted">Todavía no se registraron cobros adicionales a la seña de Excel.</p>}</div>
  </section>;
}
