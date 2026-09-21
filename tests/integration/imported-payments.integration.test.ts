import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import Decimal from "decimal.js";
import { recordClientPayment, type ClientPaymentInput } from "@/server/treasury/client-payments";
import { legacyCollection } from "@/lib/treasury/legacy-collection";
import { deleteEventRecord } from "@/server/events/delete-event";
const db = new PrismaClient();
let actorId: string, eventId: string, clientId: string, accountId: string;
let quoteId: string | undefined;
describe.runIf(process.env.RUN_DB_INTEGRATION === "true")("imported client receipts with PostgreSQL", () => {
  beforeAll(async () => {
    const url = new URL(process.env.DATABASE_URL!);
    if (url.hostname !== "127.0.0.1" || url.pathname !== "/murray_djs_e2e") throw new Error("Requires local murray_djs_e2e");
    actorId = (await db.user.findFirstOrThrow({ where: { role: "ADMIN" } })).id;
    clientId = (await db.client.create({ data: { name: "Imported receipts integration", type: "PARTICULAR" } })).id;
    eventId = (await db.event.create({ data: { number: `EXCEL-${randomUUID()}`, clientId, source: "EXCEL_IMPORT", eventTypeId: (await db.eventType.findFirstOrThrow()).id, eventDate: new Date("2026-09-19"), startTime: "21:00", endTime: "03:00", venue: "Test", legacyFinancialData: { create: { saleArs: "100.30", depositArs: "20.10", saleUsd: "10", depositUsd: "2", sourceSheet: "Hoja1", sourceRow: 500 } } } })).id;
    accountId = (await db.financialAccount.create({ data: { name: `Receipts ${randomUUID()}`, currency: "USD", type: "CASH" } })).id;
  });
  afterAll(async () => {
    if (quoteId) { await db.clientPayment.deleteMany({ where: { quoteId } }); await db.event.deleteMany({ where: { sourceQuoteId: quoteId } }); await db.quote.update({ where: { id: quoteId }, data: { confirmedVersionId: null } }); await db.quoteVersion.deleteMany({ where: { quoteId } }); await db.quote.delete({ where: { id: quoteId } }); }
    if (eventId) { await db.clientPayment.deleteMany({ where: { eventId } }); await db.treasuryTransaction.deleteMany({ where: { accountId } }); await db.eventLegacyFinancialData.delete({ where: { eventId } }); await db.event.delete({ where: { id: eventId } }); await db.client.delete({ where: { id: clientId } }); await db.financialAccount.delete({ where: { id: accountId } }); }
    await db.$disconnect();
  });
  const input = (overrides: Partial<ClientPaymentInput> = {}): ClientPaymentInput => ({ eventId, currency: "ARS", amount: new Decimal("30.10"), paymentDate: new Date("2026-09-21"), paymentMethod: "TRANSFER", paymentType: "PARTIAL", idempotencyKey: randomUUID(), confirmQuote: false, notes: "Saldo recibido", receivedViaPartner: false, partnerName: null, ...overrides });
  const record = (data: ClientPaymentInput, actor = actorId) => db.$transaction(tx => recordClientPayment(tx, data, actor), { isolationLevel: "Serializable" });
  it("stores a quote-free receipt, preserves the imported deposit and retries idempotently", async () => {
    const data = input(); const receipt = await record(data); await record(data);
    expect(receipt).toMatchObject({ quoteId: null, quoteVersionId: null, eventId, clientId, treasuryTransactionId: null, accountId: null });
    expect(await db.clientPayment.count({ where: { idempotencyKey: data.idempotencyKey } })).toBe(1);
    const legacy = await db.eventLegacyFinancialData.findUniqueOrThrow({ where: { eventId } });
    expect(legacy.depositArs?.toFixed(2)).toBe("20.10");
    expect(legacyCollection(legacy, [receipt], "ARS").pending?.toFixed(2)).toBe("50.10");
    const audit = await db.auditLog.findFirstOrThrow({ where: { entityId: receipt.id, action: "CREATE" } });
    expect(audit).toMatchObject({ userId: actorId, operationId: data.idempotencyKey });
    expect(audit.newValue).toMatchObject({ eventId, amount: "30.10", paymentDate: "2026-09-21T00:00:00.000Z", currency: "ARS" });
  });
  it("validates account currency, and records only the additional receipt in the ledger", async () => {
    await expect(record(input({ accountId }))).rejects.toThrow("moneda");
    const receipt = await record(input({ currency: "USD", accountId, amount: new Decimal("3.10") }));
    const ledger = await db.treasuryTransaction.findUniqueOrThrow({ where: { id: receipt.treasuryTransactionId! } });
    expect(ledger.amount.toFixed(2)).toBe("3.10"); expect(ledger.currency).toBe("USD");
  });
  it("rejects forged quote references and missing currency without adding receipts", async () => {
    for (const data of [input({ currency: undefined }), input({ quoteId: randomUUID() }), input({ quoteVersionId: randomUUID() }), input({ confirmQuote: true })]) {
      await expect(record(data)).rejects.toThrow("inválidos");
      expect(await db.clientPayment.count({ where: { idempotencyKey: data.idempotencyKey } })).toBe(0);
    }
  });
  it("rolls back a receipt and ledger together if actor/audit persistence fails", async () => {
    const data = input({ accountId, currency: "USD" });
    await expect(record(data, randomUUID())).rejects.toThrow();
    expect(await db.clientPayment.count({ where: { idempotencyKey: data.idempotencyKey } })).toBe(0);
    expect(await db.treasuryTransaction.count({ where: { idempotencyKey: data.idempotencyKey } })).toBe(0);
  });
  it("preserves quote confirmation and rejects currency or snapshot mismatches", async () => {
    const quote = await db.quote.create({ data: { number: `PRE-RECEIPT-${randomUUID()}`, clientId, eventTypeId: (await db.eventType.findFirstOrThrow()).id, eventDate: new Date("2026-09-19"), startTime: "21:00", endTime: "03:00", venue: "Test quote", createdById: actorId } });
    quoteId = quote.id;
    const version = await db.quoteVersion.create({ data: { quoteId, versionNumber: 1, currency: "ARS", grossSubtotal: "100", itemDiscountTotal: 0, subtotalAfterItemDiscounts: "100", generalDiscountValue: 0, generalDiscountAmount: 0, taxableBase: "100", taxRate: 21, taxAmount: "21", totalFinal: "121", depositPercentage: 0, depositAmount: 0, balance: "121", createdById: actorId } });
    const data = input({ eventId: undefined, quoteId, quoteVersionId: version.id, confirmQuote: true });
    const receipt = await record(data); await record(data);
    expect(receipt.quoteVersionId).toBe(version.id);
    expect(await db.event.count({ where: { sourceQuoteId: quoteId } })).toBe(1);
    expect(await db.quote.findUnique({ where: { id: quoteId } })).toMatchObject({ status: "CONFIRMADO", confirmedVersionId: version.id });
    await expect(record(input({ eventId: receipt.eventId!, currency: "USD" }))).rejects.toThrow("moneda");
    await expect(record(input({ eventId: receipt.eventId!, quoteId: randomUUID() }))).rejects.toThrow("Presupuesto inválido");
    await expect(record(input({ eventId: receipt.eventId!, quoteVersionId: randomUUID() }))).rejects.toThrow("Versión comercial inválida");
  });
  it("prevents deletion once the imported event has receipt history", async () => {
    const event = await db.event.findUniqueOrThrow({ where: { id: eventId } });
    await expect(db.$transaction(tx => deleteEventRecord(tx, { eventId, eventNumber: event.number, actorId, reason: "Wrong import", operationId: randomUUID() }))).rejects.toThrow("historial financiero");
  });
});
