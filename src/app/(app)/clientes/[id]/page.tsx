import Decimal from "decimal.js";
import { notFound } from "next/navigation";

import { addContact, updateClient } from "@/app/actions/clients";
import { formatMoney } from "@/lib/money/format";
import { requireManagement } from "@/server/auth/authorization";
import { prisma } from "@/server/db/prisma";

export default async function ClientDetail({ params }: { params: Promise<{ id: string }> }) {
  await requireManagement();
  const { id } = await params;
  const client = await prisma.client.findUnique({ where: { id }, include: { contacts: true, quotes: { orderBy: { createdAt: "desc" }, take: 10 }, payments: { include: { event: true, account: true }, orderBy: { paymentDate: "desc" } } } });
  if (!client) notFound();
  const totals = { ARS: new Decimal(0), USD: new Decimal(0) };
  for (const payment of client.payments.filter((item) => item.status === "ACTIVE")) totals[payment.currency] = totals[payment.currency].plus(payment.amount);

  return <>
    <div className="topbar"><div><div className="eyebrow">{client.type}</div><h1>{client.name}</h1></div></div>
    <section className="grid grid-2"><details className="card"><summary style={{ cursor: "pointer", fontWeight: 700 }}>Datos del cliente</summary><form action={updateClient.bind(null, id)} className="form" style={{ marginTop: 16 }}><div className="field"><label>Nombre</label><input name="name" defaultValue={client.name} required /></div><div className="form-grid"><Field label="Teléfono" name="phone" value={client.phone} /><Field label="Email" name="email" value={client.email} type="email" /><Field label="Localidad" name="locality" value={client.locality} /><Field label="Dirección" name="address" value={client.address} /></div><div className="field"><label>Observaciones</label><textarea name="notes" defaultValue={client.notes || ""} /></div><button className="btn btn-primary">Guardar cambios</button></form></details><div className="card"><h2>Contactos</h2><div className="stack">{client.contacts.map((contact) => <div key={contact.id}><strong>{contact.name}</strong>{contact.isPrimary && <span className="badge badge-green" style={{ marginLeft: 8 }}>Principal</span>}<div className="muted">{contact.phone || contact.email || "Sin datos"}</div></div>)}</div></div></section>
    {(client.type === "EMPRESA" || !client.contacts.length) && <><div className="section-head"><h2>Agregar contacto</h2></div><form action={addContact.bind(null, id)} className="card form-grid"><div className="field"><label>Nombre *</label><input name="name" required /></div><div className="field"><label>Teléfono</label><input name="phone" type="tel" /></div><div className="field"><label>Email</label><input name="email" type="email" /></div><div className="field"><label>Cargo</label><input name="position" /></div><label className="row"><input name="isPrimary" type="checkbox" /> Contacto principal</label><div><button className="btn btn-primary">Agregar</button></div></form></>}
    <div className="section-head"><h2>Pagos</h2><span className="muted">Histórico: {formatMoney(totals.ARS.toFixed(2), "ARS")} · {formatMoney(totals.USD.toFixed(2), "USD")}</span></div><div className="stack">{client.payments.map((payment) => <article className={`card row space ${payment.status === "VOID" ? "expense-void" : ""}`} key={payment.id}><div><strong>{payment.paymentDate.toLocaleDateString("es-AR", { timeZone: "UTC" })} · {payment.event?.number || payment.paymentType}</strong><p className="muted">{payment.account?.name || "Registro operativo"} · {payment.paymentType}</p></div><strong>{formatMoney(String(payment.amount), payment.currency)}</strong></article>)}</div>
    <div className="section-head"><h2>Historial de presupuestos</h2></div><div className="table-wrap"><table className="table"><tbody>{client.quotes.map((quote) => <tr key={quote.id}><td><a href={`/presupuestos/${quote.id}`}>{quote.number}</a></td><td>{quote.eventDate.toLocaleDateString("es-AR", { timeZone: "UTC" })}</td><td><span className="badge">{quote.status}</span></td></tr>)}{!client.quotes.length && <tr><td className="empty">Sin presupuestos todavía.</td></tr>}</tbody></table></div>
  </>;
}

function Field({ label, name, value, type = "text" }: { label: string; name: string; value: string | null; type?: string }) { return <div className="field"><label>{label}</label><input name={name} type={type} defaultValue={value || ""} /></div>; }
