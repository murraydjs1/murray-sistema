"use server";

import { randomUUID } from "node:crypto";
import { ClientType, Currency, EventStatus, QuoteStatus } from "@prisma/client";
import { redirect } from "next/navigation";
import { z } from "zod";

import { suggestSetupTime } from "@/lib/dates/times";
import { calculateQuote, moneyString } from "@/lib/money/quote-calculator";
import { audit } from "@/server/audit/audit";
import { requireOperations } from "@/server/auth/authorization";
import { prisma } from "@/server/db/prisma";
import { nextNumber } from "@/server/services/sequence";

const inputSchema = z.object({
  eventTypeId: z.string().uuid(),
  eventDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  setupTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  venue: z.string().trim().min(1),
  currency: z.nativeEnum(Currency),
  price: z.string().refine((value) => { try { return Number(value) >= 0; } catch { return false; } }, "Importe inválido"),
  taxRate: z.enum(["0", "21"]),
  depositPercentage: z.string().refine((value) => Number(value) >= 0 && Number(value) <= 100, "Seña inválida"),
  status: z.enum([EventStatus.CONFIRMADO, EventStatus.REALIZADO]),
  managerStaffId: z.string().uuid().optional(),
});

export async function createEvent(formData: FormData) {
  const actor = await requireOperations();
  const input = inputSchema.parse({
    eventTypeId: text(formData, "eventTypeId"), eventDate: text(formData, "eventDate"), startTime: text(formData, "startTime"), endTime: text(formData, "endTime"),
    setupTime: optional(formData, "setupTime"), venue: text(formData, "venue"), currency: text(formData, "currency"), price: text(formData, "price"),
    taxRate: text(formData, "taxRate"), depositPercentage: text(formData, "depositPercentage") || "0", status: text(formData, "status"), managerStaffId: optional(formData, "managerStaffId"),
  });
  const eventDate = new Date(`${input.eventDate}T00:00:00.000Z`);
  const calculated = calculateQuote({ items: [{ description: "Servicio integral del evento", quantity: 1, listUnitPrice: input.price, discount: { type: "NONE", value: 0 } }], generalDiscount: { type: "NONE", value: 0 }, taxRate: input.taxRate, depositPercentage: input.depositPercentage });
  const event = await prisma.$transaction(async (tx) => {
    const operationId = randomUUID();
    let clientId = text(formData, "clientId");
    if (text(formData, "clientMode") === "NEW") {
      const name = text(formData, "clientName");
      const type = text(formData, "clientType") as ClientType;
      if (!name || !Object.values(ClientType).includes(type)) throw new Error("Completá los datos del cliente");
      const client = await tx.client.create({ data: { name, type, phone: optional(formData, "clientPhone"), email: optional(formData, "clientEmail"), locality: optional(formData, "clientLocality"), address: optional(formData, "clientAddress") } });
      const contactName = optional(formData, "contactName");
      if (contactName) await tx.clientContact.create({ data: { clientId: client.id, name: contactName, phone: optional(formData, "contactPhone"), email: optional(formData, "contactEmail"), isPrimary: true } });
      await audit(tx, { userId: actor.id, action: "CREATE", entity: "Client", entityId: client.id, newValue: { name, type, createdFrom: "Event" }, operationId });
      clientId = client.id;
    } else if (!clientId || !(await tx.client.findFirst({ where: { id: clientId, active: true }, select: { id: true } }))) throw new Error("Seleccioná un cliente válido");
    await tx.eventType.findFirstOrThrow({ where: { id: input.eventTypeId, active: true } });
    if (input.managerStaffId) await tx.staff.findFirstOrThrow({ where: { id: input.managerStaffId, active: true } });

    const quoteNumber = await nextNumber(tx, "QUOTE", eventDate);
    const quote = await tx.quote.create({ data: { number: quoteNumber, clientId, eventTypeId: input.eventTypeId, eventDate, guestCount: optionalNumber(formData, "guestCount"), venue: input.venue, address: optional(formData, "address"), locality: optional(formData, "locality"), googleMapsUrl: optional(formData, "googleMapsUrl"), startTime: input.startTime, endTime: input.endTime, status: input.status === EventStatus.REALIZADO ? QuoteStatus.REALIZADO : QuoteStatus.CONFIRMADO, notes: optional(formData, "notes"), createdById: actor.id } });
    const version = await tx.quoteVersion.create({ data: { quoteId: quote.id, versionNumber: 1, currency: input.currency, grossSubtotal: moneyString(calculated.grossSubtotal), itemDiscountTotal: moneyString(calculated.itemDiscountTotal), subtotalAfterItemDiscounts: moneyString(calculated.subtotalAfterItemDiscounts), generalDiscountType: "NONE", generalDiscountValue: "0", generalDiscountAmount: moneyString(calculated.generalDiscountAmount), taxableBase: moneyString(calculated.taxableBase), taxName: calculated.taxRate.gt(0) ? "IVA" : null, taxRate: calculated.taxRate.toFixed(4), taxAmount: moneyString(calculated.taxAmount), totalFinal: moneyString(calculated.totalFinal), depositPercentage: calculated.depositPercentage.toFixed(4), depositAmount: moneyString(calculated.depositAmount), balance: moneyString(calculated.balance), createdById: actor.id, items: { create: { type: "CUSTOM", description: "Servicio integral del evento", quantity: "1", currency: input.currency, listUnitPrice: moneyString(calculated.items[0].listUnitPrice), discountType: "NONE", discountValue: "0", grossAmount: moneyString(calculated.items[0].grossAmount), discountAmount: moneyString(calculated.items[0].discountAmount), finalAmount: moneyString(calculated.items[0].finalAmount), sortOrder: 0 } } } });
    await tx.quote.update({ where: { id: quote.id }, data: { confirmedVersionId: version.id } });
    const eventNumber = await nextNumber(tx, "EVENT", eventDate);
    const created = await tx.event.create({ data: { number: eventNumber, clientId, eventTypeId: input.eventTypeId, sourceQuoteId: quote.id, sourceQuoteVersionId: version.id, eventDate, startTime: input.startTime, endTime: input.endTime, setupTime: input.setupTime || suggestSetupTime(input.startTime), guestCount: optionalNumber(formData, "guestCount"), venue: input.venue, address: optional(formData, "address"), locality: optional(formData, "locality"), googleMapsUrl: optional(formData, "googleMapsUrl"), status: input.status, notes: optional(formData, "notes"), managerStaffId: input.managerStaffId } });
    await audit(tx, { userId: actor.id, action: "CREATE", entity: "Quote", entityId: quote.id, newValue: { number: quoteNumber, status: quote.status, createdFrom: "Event", versionId: version.id, totalFinal: moneyString(calculated.totalFinal), currency: input.currency }, operationId });
    await audit(tx, { userId: actor.id, action: "CREATE", entity: "Event", entityId: created.id, newValue: { number: eventNumber, sourceQuoteId: quote.id, sourceQuoteVersionId: version.id, managerStaffId: input.managerStaffId || null, status: input.status }, operationId });
    return created;
  });
  redirect(`/eventos/${event.id}`);
}

function text(formData: FormData, key: string) { return String(formData.get(key) ?? "").trim(); }
function optional(formData: FormData, key: string) { return text(formData, key) || undefined; }
function optionalNumber(formData: FormData, key: string) { const value = text(formData, key); return value ? Number(value) : null; }
