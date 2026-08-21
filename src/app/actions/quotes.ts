"use server";
import { randomUUID } from "node:crypto";
import { ClientType, Currency, DiscountType, Prisma, QuoteItemType, QuoteStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/server/db/prisma";
import { requireManagement } from "@/server/auth/authorization";
import { audit } from "@/server/audit/audit";
import { nextNumber } from "@/server/services/sequence";
import { calculateQuote, moneyString, type QuoteItemInput } from "@/lib/money/quote-calculator";
import { suggestSetupTime } from "@/lib/dates/times";

type EditorItem = QuoteItemInput & { type: QuoteItemType; serviceId?: string; addOnId?: string; currency: Currency };

export async function createQuote(formData: FormData) {
  const actor = await requireManagement();
  const eventDate = new Date(`${String(formData.get("eventDate"))}T00:00:00.000Z`);
  if (Number.isNaN(eventDate.valueOf())) throw new Error("Fecha inválida");
  const quote = await prisma.$transaction(async tx => {
    const operationId = randomUUID();
    let clientId = String(formData.get("clientId") || "");
    if (formData.get("clientMode") === "NEW") {
      const name = String(formData.get("clientName") || "").trim();
      const type = String(formData.get("clientType")) as ClientType;
      if (!name || !Object.values(ClientType).includes(type)) throw new Error("Completá los datos del cliente");
      const client = await tx.client.create({ data: { name, type, phone: nullable(formData, "clientPhone"), email: nullable(formData, "clientEmail"), locality: nullable(formData, "clientLocality"), address: nullable(formData, "clientAddress") } });
      const contactName = nullable(formData, "contactName");
      if (contactName) await tx.clientContact.create({ data: { clientId: client.id, name: contactName, phone: nullable(formData, "contactPhone"), email: nullable(formData, "contactEmail"), isPrimary: true } });
      await audit(tx, { userId: actor.id, action: "CREATE", entity: "Client", entityId: client.id, newValue: { name, type, createdFrom: "Quote" }, operationId });
      clientId = client.id;
    } else if (!clientId || !(await tx.client.findFirst({ where: { id: clientId, active: true }, select: { id: true } }))) throw new Error("Seleccioná un cliente válido");
    const number = await nextNumber(tx, "QUOTE", eventDate);
    const created = await tx.quote.create({ data: { number, clientId, eventTypeId: String(formData.get("eventTypeId")), eventDate, guestCount: formData.get("guestCount") ? Number(formData.get("guestCount")) : null, venue: String(formData.get("venue") || "").trim(), address: nullable(formData, "address"), locality: nullable(formData, "locality"), googleMapsUrl: nullable(formData, "googleMapsUrl"), startTime: String(formData.get("startTime")), endTime: String(formData.get("endTime")), notes: nullable(formData, "notes"), createdById: actor.id } });
    await audit(tx, { userId: actor.id, action: "CREATE", entity: "Quote", entityId: created.id, newValue: { number, status: created.status, clientId }, operationId }); return created;
  });
  redirect(`/presupuestos/${quote.id}/editar`);
}

export async function updateQuote(quoteId: string, formData: FormData) {
  const actor = await requireManagement();
  const eventDate = new Date(`${String(formData.get("eventDate"))}T00:00:00.000Z`);
  if (Number.isNaN(eventDate.valueOf())) throw new Error("Fecha inválida");
  await prisma.$transaction(async tx => {
    const previous = await tx.quote.findUniqueOrThrow({ where: { id: quoteId } });
    const next = await tx.quote.update({ where: { id: quoteId }, data: { clientId: String(formData.get("clientId")), eventTypeId: String(formData.get("eventTypeId")), eventDate, guestCount: formData.get("guestCount") ? Number(formData.get("guestCount")) : null, venue: String(formData.get("venue") || "").trim(), address: nullable(formData, "address"), locality: nullable(formData, "locality"), googleMapsUrl: nullable(formData, "googleMapsUrl"), startTime: String(formData.get("startTime")), endTime: String(formData.get("endTime")), notes: nullable(formData, "notes") } });
    await audit(tx, { userId: actor.id, action: "UPDATE", entity: "Quote", entityId: quoteId, previousValue: quoteSnapshot(previous), newValue: quoteSnapshot(next), operationId: randomUUID() });
  });
  revalidatePath(`/presupuestos/${quoteId}`); revalidatePath("/presupuestos"); revalidatePath("/dashboard");
}

export async function saveQuoteVersion(quoteId: string, payload: string) {
  const actor = await requireManagement();
  const raw = JSON.parse(payload) as { currency: Currency; items: EditorItem[]; generalDiscount: { type: DiscountType; value: number | string }; taxRate: number | string; taxName?: string; depositPercentage: number | string; notes?: string };
  if (!Object.values(Currency).includes(raw.currency) || raw.items.some(i => i.currency !== raw.currency)) throw new Error("Todos los ítems deben usar la moneda de la versión");
  const calculated = calculateQuote(raw);
  const version = await prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM "Quote" WHERE id = ${quoteId}::uuid FOR UPDATE`;
    const latest = await tx.quoteVersion.aggregate({ where: { quoteId }, _max: { versionNumber: true } });
    const created = await tx.quoteVersion.create({ data: { quoteId, versionNumber: (latest._max.versionNumber || 0) + 1, currency: raw.currency, grossSubtotal: moneyString(calculated.grossSubtotal), itemDiscountTotal: moneyString(calculated.itemDiscountTotal), subtotalAfterItemDiscounts: moneyString(calculated.subtotalAfterItemDiscounts), generalDiscountType: raw.generalDiscount.type, generalDiscountValue: String(raw.generalDiscount.value || 0), generalDiscountAmount: moneyString(calculated.generalDiscountAmount), taxableBase: moneyString(calculated.taxableBase), taxName: calculated.taxRate.gt(0) ? (raw.taxName || "IVA") : null, taxRate: calculated.taxRate.toFixed(4), taxAmount: moneyString(calculated.taxAmount), totalFinal: moneyString(calculated.totalFinal), depositPercentage: calculated.depositPercentage.toFixed(4), depositAmount: moneyString(calculated.depositAmount), balance: moneyString(calculated.balance), notes: raw.notes, createdById: actor.id, items: { create: calculated.items.map((item, index) => ({ type: raw.items[index].type, serviceId: raw.items[index].serviceId || null, addOnId: raw.items[index].addOnId || null, description: item.description, quantity: item.quantity.toString(), currency: raw.currency, listUnitPrice: moneyString(item.listUnitPrice), discountType: item.discount.type, discountValue: String(item.discount.value || 0), grossAmount: moneyString(item.grossAmount), discountAmount: moneyString(item.discountAmount), finalAmount: moneyString(item.finalAmount), sortOrder: index })) } } });
    await audit(tx, { userId: actor.id, action: "CREATE_VERSION", entity: "Quote", entityId: quoteId, newValue: { versionId: created.id, versionNumber: created.versionNumber, totalFinal: moneyString(calculated.totalFinal), currency: raw.currency }, operationId: randomUUID() }); return created;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  revalidatePath(`/presupuestos/${quoteId}`); return { id: version.id, versionNumber: version.versionNumber };
}

export async function changeQuoteStatus(quoteId: string, status: QuoteStatus) {
  const actor = await requireManagement();
  if (status === QuoteStatus.CONFIRMADO) throw new Error("Usá la acción de confirmar con una versión explícita");
  await prisma.$transaction(async tx => { const old = await tx.quote.findUniqueOrThrow({ where: { id: quoteId } }); const next = await tx.quote.update({ where: { id: quoteId }, data: { status } }); await audit(tx, { userId: actor.id, action: "STATUS_CHANGE", entity: "Quote", entityId: quoteId, previousValue: { status: old.status }, newValue: { status: next.status }, operationId: randomUUID() }); });
  revalidatePath(`/presupuestos/${quoteId}`);
}

export async function registerProposalSent(quoteId: string) {
  const actor = await requireManagement();
  await prisma.$transaction(async tx => {
    const quote = await tx.quote.findUniqueOrThrow({ where: { id: quoteId } });
    if (quote.status === QuoteStatus.CANCELADO) throw new Error("No se puede enviar una propuesta cancelada");
    if (quote.status === QuoteStatus.CONSULTA) {
      await tx.quote.update({ where: { id: quoteId }, data: { status: QuoteStatus.PRESUPUESTO_ENVIADO } });
    }
    await audit(tx, {
      userId: actor.id,
      action: "PROPOSAL_SHARED",
      entity: "Quote",
      entityId: quoteId,
      previousValue: { status: quote.status },
      newValue: { status: quote.status === QuoteStatus.CONSULTA ? QuoteStatus.PRESUPUESTO_ENVIADO : quote.status },
      operationId: randomUUID(),
    });
  });
  revalidatePath(`/presupuestos/${quoteId}`);
  revalidatePath("/presupuestos");
}

export async function confirmQuote(quoteId: string, versionId: string, setupTime?: string) {
  const actor = await requireManagement();
  const event = await prisma.$transaction(async tx => {
    const quote = await tx.quote.findUniqueOrThrow({ where: { id: quoteId }, include: { event: true } });
    if (quote.event) return quote.event;
    const version = await tx.quoteVersion.findFirstOrThrow({ where: { id: versionId, quoteId } });
    const number = await nextNumber(tx, "EVENT", quote.eventDate);
    const created = await tx.event.create({ data: { number, clientId: quote.clientId, eventTypeId: quote.eventTypeId, sourceQuoteId: quote.id, sourceQuoteVersionId: version.id, eventDate: quote.eventDate, startTime: quote.startTime, endTime: quote.endTime, setupTime: setupTime || suggestSetupTime(quote.startTime), guestCount: quote.guestCount, venue: quote.venue, address: quote.address, locality: quote.locality, googleMapsUrl: quote.googleMapsUrl, notes: quote.notes } });
    await tx.quote.update({ where: { id: quoteId }, data: { status: QuoteStatus.CONFIRMADO, confirmedVersionId: version.id } });
    const operationId=randomUUID();
    await audit(tx, { userId: actor.id, action: "CONFIRM_AND_CREATE_EVENT", entity: "Quote", entityId: quoteId, newValue: { versionId, eventId: created.id, eventNumber: number }, operationId });
    await audit(tx, { userId: actor.id, action: "CREATE", entity: "Event", entityId: created.id, newValue: { number, sourceQuoteId: quoteId, sourceQuoteVersionId: versionId }, operationId }); return created;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  revalidatePath("/dashboard"); revalidatePath("/agenda"); redirect(`/eventos/${event.id}`);
}
function nullable(data: FormData, key: string) { const value = String(data.get(key) || "").trim(); return value || null; }
function quoteSnapshot(q: { clientId:string; eventTypeId:string; eventDate:Date; guestCount:number|null; venue:string; address:string|null; locality:string|null; googleMapsUrl:string|null; startTime:string; endTime:string; notes:string|null }) { return { clientId:q.clientId,eventTypeId:q.eventTypeId,eventDate:q.eventDate.toISOString().slice(0,10),guestCount:q.guestCount,venue:q.venue,address:q.address,locality:q.locality,googleMapsUrl:q.googleMapsUrl,startTime:q.startTime,endTime:q.endTime,notes:q.notes }; }
