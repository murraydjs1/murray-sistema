import { randomUUID } from "node:crypto";
import { ClientPaymentMethod, ClientPaymentType, Currency, Prisma } from "@prisma/client";
import Decimal from "decimal.js";
import { audit } from "@/server/audit/audit";
import { createLedgerMovement, requireAccount } from "./ledger";
import { nextNumber } from "@/server/services/sequence";
import { suggestSetupTime } from "@/lib/dates/times";

export type ClientPaymentInput = {
  eventId?: string; quoteId?: string; quoteVersionId?: string; accountId?: string; currency?: Currency;
  amount: Decimal; paymentDate: Date; paymentMethod: ClientPaymentMethod; paymentType: ClientPaymentType;
  idempotencyKey: string; confirmQuote: boolean; notes: string | null; receivedViaPartner: boolean; partnerName: string | null;
};

export async function recordClientPayment(tx: Prisma.TransactionClient, input: ClientPaymentInput, actorId: string) {
  const existing = await tx.clientPayment.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
  if (existing) return existing;
  let event = input.eventId ? await tx.event.findUniqueOrThrow({ where: { id: input.eventId }, include: { legacyFinancialData: true } }) : null;
  let quoteId: string | null = null, versionId: string | null = null;
  let currency: Currency, clientId: string, reference: string;
  if (event?.source === "EXCEL_IMPORT" && !event.sourceQuoteId && !event.sourceQuoteVersionId) {
    if (!event.legacyFinancialData || !input.currency || input.quoteId || input.quoteVersionId || input.confirmQuote) throw new Error("Datos de cobro importado inválidos");
    currency = input.currency;
    clientId = event.clientId;
    reference = event.number;
  } else {
    quoteId = event?.sourceQuoteId ?? input.quoteId ?? null;
    if (!quoteId || (event && input.quoteId && input.quoteId !== event.sourceQuoteId)) throw new Error("Presupuesto inválido");
    const quote = await tx.quote.findUniqueOrThrow({ where: { id: quoteId } });
    if (!event) event = await tx.event.findUnique({ where: { sourceQuoteId: quote.id }, include: { legacyFinancialData: true } });
    versionId = event?.sourceQuoteVersionId ?? input.quoteVersionId ?? quote.confirmedVersionId;
    if (event && input.quoteVersionId && input.quoteVersionId !== event.sourceQuoteVersionId) throw new Error("Versión comercial inválida");
    const version = versionId ? await tx.quoteVersion.findFirst({ where: { id: versionId, quoteId: quote.id } }) : null;
    if (!version) throw new Error("Seleccioná una versión comercial");
    currency = version.currency; clientId = quote.clientId; reference = quote.number;
    if (input.currency && input.currency !== currency) throw new Error("La moneda no coincide con el presupuesto");
    if (input.confirmQuote && !event) {
      const number = await nextNumber(tx, "EVENT", quote.eventDate);
      event = await tx.event.create({ data: { number, clientId, eventTypeId: quote.eventTypeId, sourceQuoteId: quote.id, sourceQuoteVersionId: version.id, eventDate: quote.eventDate, startTime: quote.startTime, endTime: quote.endTime, setupTime: suggestSetupTime(quote.startTime), guestCount: quote.guestCount, venue: quote.venue, address: quote.address, locality: quote.locality, googleMapsUrl: quote.googleMapsUrl, notes: quote.notes }, include: { legacyFinancialData: true } });
      await tx.quote.update({ where: { id: quote.id }, data: { status: "CONFIRMADO", confirmedVersionId: version.id } });
      await audit(tx, { userId: actorId, action: "CONFIRM_AND_CREATE_EVENT", entity: "Quote", entityId: quote.id, newValue: { versionId: version.id, eventId: event.id, eventNumber: number }, operationId: input.idempotencyKey });
    }
  }
  const amount = input.amount.toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
  if (!amount.isFinite() || !amount.gt(0) || amount.gte("10000000000000000")) throw new Error("Importe inválido");
  if (input.accountId) await requireAccount(tx, input.accountId, currency);
  const id = randomUUID();
  const movement = input.accountId ? await createLedgerMovement(tx, { accountId: input.accountId, direction: "INFLOW", category: "CLIENT_PAYMENT", amount, currency, date: input.paymentDate, description: `Cobro ${input.paymentType} · ${reference}`, referenceType: "ClientPayment", referenceId: id, createdById: actorId, idempotencyKey: input.idempotencyKey }) : null;
  const created = await tx.clientPayment.create({ data: { id, clientId, eventId: event?.id ?? null, quoteId, quoteVersionId: versionId, accountId: input.accountId, amount: amount.toFixed(2), currency, paymentDate: input.paymentDate, paymentMethod: input.paymentMethod, paymentType: input.paymentType, notes: input.notes, receivedViaPartner: input.receivedViaPartner, partnerName: input.partnerName, idempotencyKey: input.idempotencyKey, treasuryTransactionId: movement?.id, createdById: actorId } });
  await audit(tx, { userId: actorId, action: "CREATE", entity: "ClientPayment", entityId: id, newValue: { clientId, quoteId, quoteVersionId: versionId, eventId: event?.id ?? null, amount: created.amount.toFixed(2), currency, accountId: created.accountId, paymentType: created.paymentType, paymentDate: input.paymentDate.toISOString(), paymentMethod: input.paymentMethod, notes: input.notes }, operationId: input.idempotencyKey });
  return created;
}
