"use client";

import { useState } from "react";
import { createEvent } from "@/app/actions/events";

type Option = { id: string; name: string };

export function NewEventForm({ clients, eventTypes, staff }: { clients: Option[]; eventTypes: Option[]; staff: Option[] }) {
  const [mode, setMode] = useState<"EXISTING" | "NEW">(clients.length ? "EXISTING" : "NEW");
  return <form action={createEvent} className="card form">
    <fieldset className="choice-group"><legend>Cliente</legend><label><input type="radio" name="clientMode" value="EXISTING" checked={mode === "EXISTING"} disabled={!clients.length} onChange={() => setMode("EXISTING")} /> Existente</label><label><input type="radio" name="clientMode" value="NEW" checked={mode === "NEW"} onChange={() => setMode("NEW")} /> Nuevo cliente</label></fieldset>
    {mode === "EXISTING" ? <div className="field"><label htmlFor="clientId">Cliente *</label><select id="clientId" name="clientId" required>{clients.map((client) => <option value={client.id} key={client.id}>{client.name}</option>)}</select></div> : <section className="subform" aria-label="Datos del nuevo cliente"><h2>Nuevo cliente</h2><div className="form-grid"><Field id="clientName" label="Nombre / razón social *" required /><div className="field"><label htmlFor="clientType">Tipo *</label><select id="clientType" name="clientType"><option value="PARTICULAR">Particular</option><option value="EMPRESA">Empresa</option></select></div><Field id="clientPhone" label="Teléfono" /><Field id="clientEmail" label="Email" type="email" /><Field id="contactName" label="Contacto principal" /><Field id="contactPhone" label="Teléfono del contacto" /></div></section>}
    <div className="section-divider"><span>Datos del evento</span></div><div className="form-grid">
      <div className="field"><label htmlFor="eventTypeId">Tipo de evento *</label><select id="eventTypeId" name="eventTypeId" required>{eventTypes.map((type) => <option value={type.id} key={type.id}>{type.name}</option>)}</select></div><Field id="eventDate" label="Fecha *" type="date" required /><Field id="guestCount" label="Invitados" type="number" /><Field id="venue" label="Lugar *" required /><Field id="startTime" label="Inicio *" type="time" required /><Field id="endTime" label="Finalización *" type="time" required /><Field id="setupTime" label="Armado" type="time" /><Field id="address" label="Dirección" /><Field id="locality" label="Localidad" /><Field id="googleMapsUrl" label="Google Maps" type="url" />
      <div className="field"><label htmlFor="status">Estado inicial</label><select id="status" name="status"><option value="CONFIRMADO">Confirmado</option><option value="REALIZADO">Realizado</option></select></div><div className="field"><label htmlFor="managerStaffId">Encargado</label><select id="managerStaffId" name="managerStaffId"><option value="">Sin definir</option>{staff.map((person) => <option value={person.id} key={person.id}>{person.name}</option>)}</select></div>
    </div>
    <div className="section-divider"><span>Precio acordado</span></div><div className="form-grid"><div className="field"><label htmlFor="currency">Moneda</label><select id="currency" name="currency"><option>ARS</option><option>USD</option></select></div><Field id="price" label="Importe sin IVA *" type="number" required /><div className="field"><label htmlFor="taxRate">IVA</label><select id="taxRate" name="taxRate"><option value="0">Sin IVA</option><option value="21">21%</option></select></div><Field id="depositPercentage" label="Seña pactada (%)" type="number" defaultValue="0" required /></div>
    <div className="field"><label htmlFor="notes">Observaciones</label><textarea id="notes" name="notes" /></div><button className="btn btn-primary">Crear evento</button>
  </form>;
}

function Field({ id, label, type = "text", required, defaultValue }: { id: string; label: string; type?: string; required?: boolean; defaultValue?: string }) { return <div className="field"><label htmlFor={id}>{label}</label><input id={id} name={id} type={type} required={required} defaultValue={defaultValue} min={type === "number" ? "0" : undefined} step={type === "number" ? "0.01" : undefined} /></div>; }
