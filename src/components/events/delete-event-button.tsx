"use client";

import { useActionState, useId, useRef } from "react";
import { deleteEvent } from "@/app/actions/delete-event";

export function DeleteEventButton({ eventId, number, client, date, hasQuote }: {
  eventId: string; number: string; client: string; date: string; hasQuote: boolean;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const id = useId();
  const [state, action, pending] = useActionState(deleteEvent, { error: "" });
  return <>
    <button type="button" className="btn btn-danger event-delete-trigger" onClick={() => dialog.current?.showModal()}>Eliminar evento</button>
    <dialog ref={dialog} className="dialog event-delete-dialog" aria-labelledby={`${id}-title`} aria-describedby={`${id}-description`} onCancel={event => { if (pending) event.preventDefault(); }}>
      <div className="dialog-panel">
        <header><h2 id={`${id}-title`}>Eliminar evento cargado por error</h2></header>
        <p><strong>{number} · {client}</strong><br />{date}</p>
        <p id={`${id}-description`}>Se eliminará de la agenda, los listados y los reportes, junto con sus asignaciones de personal y datos importados. Esta acción no se puede deshacer.</p>
        {hasQuote && <p className="muted">El presupuesto y sus versiones se conservarán en estado Consulta, sin saldo pendiente de cobro. El cliente se conserva.</p>}
        <p className="muted">Si el evento se había confirmado y finalmente no se hizo, usá el estado Cancelado. Los eventos con cobros, pagos, gastos o finanzas cerradas no se pueden eliminar.</p>
        <form action={action} className="form">
          <input type="hidden" name="eventId" value={eventId} />
          <input type="hidden" name="eventNumber" value={number} />
          <div className="field"><label htmlFor={`${id}-reason`}>Motivo de eliminación</label><input id={`${id}-reason`} name="reason" placeholder="Por ejemplo: evento duplicado" minLength={3} maxLength={500} required disabled={pending} /></div>
          {state.error && <p role="alert" className="alert alert-danger">{state.error}</p>}
          <div className="dialog-actions"><button type="button" className="btn btn-secondary" disabled={pending} onClick={() => dialog.current?.close()}>Volver sin eliminar</button><button className="btn btn-danger" disabled={pending}>{pending ? "Eliminando…" : "Confirmar eliminación"}</button></div>
        </form>
      </div>
    </dialog>
  </>;
}
