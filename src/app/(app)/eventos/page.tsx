import { Currency } from "@prisma/client";
import Link from "next/link";
import { formatMoney } from "@/lib/money/format";
import { requireManagement } from "@/server/auth/authorization";
import { prisma } from "@/server/db/prisma";

export default async function Events() {
  await requireManagement();
  const events = await prisma.event.findMany({ include: { client: true, eventType: true, sourceQuoteVersion: true, legacyFinancialData: true, managerStaff: true }, orderBy: [{ eventDate: "desc" }, { startTime: "asc" }] });
  return <><div className="topbar"><div><div className="eyebrow">Operación</div><h1>Eventos</h1></div><Link className="btn btn-primary" href="/eventos/nuevo">+ Nuevo evento</Link></div><div className="table-wrap"><table className="table"><thead><tr><th>Fecha</th><th>Evento</th><th>Cliente</th><th>Estado</th><th>Encargado</th><th>Total</th></tr></thead><tbody>{events.map((event) => { const amounts = event.sourceQuoteVersion ? [{ value: event.sourceQuoteVersion.totalFinal, currency: event.sourceQuoteVersion.currency }] : legacyTotals(event.legacyFinancialData); return <tr key={event.id}><td data-label="Fecha">{event.eventDate.toLocaleDateString("es-AR", { timeZone: "UTC" })}</td><td data-label="Evento"><Link href={`/eventos/${event.id}`}>{event.number} · {event.eventType.name}</Link></td><td data-label="Cliente">{event.client.name}</td><td data-label="Estado"><span className="badge">{event.status.replaceAll("_", " ")}</span></td><td data-label="Encargado">{event.managerStaff?.name || "Sin definir"}</td><td data-label="Total">{amounts.length ? amounts.map((amount) => <div key={amount.currency}>{formatMoney(String(amount.value), amount.currency)}</div>) : "Sin importe"}</td></tr>; })}{!events.length && <tr><td colSpan={6} className="empty">Todavía no hay eventos.</td></tr>}</tbody></table></div></>;
}

function legacyTotals(value: { saleArs: unknown; saleUsd: unknown } | null) { if (!value) return []; return [{ value: value.saleArs, currency: Currency.ARS }, { value: value.saleUsd, currency: Currency.USD }].filter((amount) => amount.value != null); }
