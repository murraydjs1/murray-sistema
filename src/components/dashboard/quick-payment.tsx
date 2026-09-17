"use client";
import { useActionState, useId } from "react";
import { recordDashboardPayment } from "@/app/actions/dashboard-payments";

export function QuickPayment({ eventId, staffId, currency, date, operationId }: { eventId: string; staffId?: string; currency: "ARS" | "USD"; date: string; operationId: string }) {
  const [state, action, pending] = useActionState(recordDashboardPayment, { message: "", success: false, operationId });
  const id = useId();
  return <details className="quick-payment"><summary>{staffId ? "Registrar pago" : "Registrar cobro"} · {currency}</summary>
    <form action={action} className="form edit-panel">
      <input type="hidden" name="eventId" value={eventId} /><input type="hidden" name="currency" value={currency} />
      {staffId && <input type="hidden" name="staffId" value={staffId} />}
      <input type="hidden" name="paymentType" value="PARTIAL" />
      <div className="form-grid">
        <div className="field"><label htmlFor={`${id}-amount`}>Importe {currency}</label><input id={`${id}-amount`} name="amount" type="number" min="0.01" step="0.01" required /></div>
        <div className="field"><label htmlFor={`${id}-date`}>Fecha del movimiento</label><input id={`${id}-date`} name="paymentDate" type="date" defaultValue={date} required /></div>
        <div className="field"><label htmlFor={`${id}-method`}>Medio de pago</label><select id={`${id}-method`} name="paymentMethod"><option value="TRANSFER">Transferencia</option><option value="CASH">Efectivo</option><option value="MERCADO_PAGO">Mercado Pago</option><option value="OTHER">Otro</option></select></div>
        <div className="field"><label htmlFor={`${id}-notes`}>Notas</label><input id={`${id}-notes`} name="notes" /></div>
      </div>
      <button className="btn btn-secondary" disabled={pending}>{pending ? "Guardando…" : staffId ? "Guardar pago" : "Guardar cobro"}</button>
      {state.message && <p role={state.success ? "status" : "alert"}>{state.message}</p>}
    </form>
  </details>;
}
