import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import { deleteEventRecord } from "@/server/events/delete-event";

const db = new PrismaClient();
const run = process.env.RUN_DB_INTEGRATION === "true";
const created: Array<{ eventId: string; quoteId: string; versionId: string; clientId: string }> = [];
let actorId: string, staffId: string, eventTypeId: string, categoryId: string;

describe.runIf(run)("delete mistaken events with PostgreSQL", () => {
  beforeAll(async () => {
    if (new URL(process.env.DATABASE_URL!).pathname !== "/murray_djs_e2e") throw new Error("Deletion tests require murray_djs_e2e");
    actorId = (await db.user.findFirstOrThrow({ where: { role: "ADMIN" } })).id;
    staffId = (await db.staff.findFirstOrThrow()).id;
    eventTypeId = (await db.eventType.findFirstOrThrow()).id;
    categoryId = (await db.expenseCategory.findFirstOrThrow()).id;
  });
  afterAll(async () => {
    for (const item of created) {
      await db.clientPayment.deleteMany({ where: { quoteVersionId: item.versionId } });
      await db.staffPayment.deleteMany({ where: { eventId: item.eventId } });
      await db.eventExpense.deleteMany({ where: { eventId: item.eventId } });
      await db.eventStaff.deleteMany({ where: { eventId: item.eventId } });
      await db.eventLegacyFinancialData.deleteMany({ where: { eventId: item.eventId } });
      await db.excelImportRecord.deleteMany({ where: { eventId: item.eventId } });
      await db.event.deleteMany({ where: { id: item.eventId } });
      await db.quote.update({ where: { id: item.quoteId }, data: { confirmedVersionId: null } });
      await db.quoteVersion.delete({ where: { id: item.versionId } });
      await db.quote.delete({ where: { id: item.quoteId } });
      await db.client.delete({ where: { id: item.clientId } });
    }
    await db.$disconnect();
  });
  async function fixture() {
    const suffix = randomUUID();
    const client = await db.client.create({ data: { name: `Delete ${suffix}`, type: "PARTICULAR" } });
    const quote = await db.quote.create({ data: { number: `PRE-DEL-${suffix}`, clientId: client.id, eventTypeId, eventDate: new Date("2027-06-10"), venue: "Delete test", startTime: "21:00", endTime: "03:00", createdById: actorId, status: "CONFIRMADO" } });
    const version = await db.quoteVersion.create({ data: { quoteId: quote.id, versionNumber: 1, currency: "ARS", grossSubtotal: "100.50", itemDiscountTotal: 0, subtotalAfterItemDiscounts: "100.50", generalDiscountValue: 0, generalDiscountAmount: 0, taxableBase: "100.50", taxRate: 0, taxAmount: 0, totalFinal: "100.50", depositPercentage: 0, depositAmount: 0, balance: "100.50", createdById: actorId } });
    await db.quote.update({ where: { id: quote.id }, data: { confirmedVersionId: version.id } });
    const event = await db.event.create({ data: { number: `EVT-DEL-${suffix}`, clientId: client.id, eventTypeId, eventDate: quote.eventDate, venue: quote.venue, startTime: "21:00", endTime: "03:00", sourceQuoteId: quote.id, sourceQuoteVersionId: version.id } });
    created.push({ eventId: event.id, quoteId: quote.id, versionId: version.id, clientId: client.id });
    return { event, quote, version };
  }
  const remove = (event: { id: string; number: string }, overrides = {}) => db.$transaction(tx => deleteEventRecord(tx, { eventId: event.id, eventNumber: event.number, reason: "Duplicado", actorId, operationId: randomUUID(), ...overrides }), { isolationLevel: "Serializable" });

  it("deletes the event and assignments, preserves commercial versions and audits the actor/reason", async () => {
    const { event, quote, version } = await fixture();
    const assignment = await db.eventStaff.create({ data: { eventId: event.id, staffId, assignmentType: "DJ", agreedAmount: "50.25", currency: "ARS", createdById: actorId } });
    await remove(event);
    expect(await db.event.findUnique({ where: { id: event.id } })).toBeNull();
    expect(await db.eventStaff.count({ where: { eventId: event.id } })).toBe(0);
    expect(await db.quote.findUnique({ where: { id: quote.id } })).toMatchObject({ status: "CONSULTA", confirmedVersionId: null });
    expect((await db.quoteVersion.findUniqueOrThrow({ where: { id: version.id } })).totalFinal.toString()).toBe("100.5");
    const audit = await db.auditLog.findFirstOrThrow({ where: { entityId: event.id, action: "DELETE" } });
    expect(audit.userId).toBe(actorId); expect(audit.newValue).toEqual({ reason: "Duplicado" });
    expect(audit.previousValue).toMatchObject({ number: event.number, staffAssignments: [{ agreedAmount: "50.25" }] });
    expect(await db.auditLog.count({ where: { operationId: audit.operationId, entityId: assignment.id, action: "REMOVE" } })).toBe(1);
    await remove(event);
    expect(await db.auditLog.count({ where: { entityId: event.id, action: "DELETE" } })).toBe(1);
  });
  it("removes an imported mistake while retaining its original snapshot in the audit", async () => {
    const { event } = await fixture();
    await db.event.update({ where: { id: event.id }, data: { source: "EXCEL_IMPORT", sourceQuoteId: null, sourceQuoteVersionId: null } });
    await db.eventLegacyFinancialData.create({ data: { eventId: event.id, sourceSheet: "2027", sourceRow: 15, saleArs: "100.50" } });
    await db.excelImportRecord.create({ data: { eventId: event.id, fileHash: randomUUID(), sheetName: "2027", rowNumber: 15, importedById: actorId } });
    await remove(event);
    expect(await db.event.findUnique({ where: { id: event.id } })).toBeNull();
    expect((await db.auditLog.findFirstOrThrow({ where: { entityId: event.id, action: "DELETE" } })).previousValue).toMatchObject({ legacyFinancialData: { sourceRow: 15, saleArs: "100.5" } });
  });
  it.each(["ACTIVE", "VOID"] as const)("preserves a %s quote-only deposit made before confirmation", async status => {
    const { event, quote, version } = await fixture();
    await db.clientPayment.create({ data: { clientId: event.clientId, quoteId: quote.id, quoteVersionId: version.id, amount: "20", currency: "ARS", paymentDate: event.eventDate, paymentMethod: "CASH", paymentType: "DEPOSIT", idempotencyKey: randomUUID(), createdById: actorId, status } });
    await expect(remove(event)).rejects.toThrow("historial financiero");
    expect(await db.event.count({ where: { id: event.id } })).toBe(1);
    expect(await db.clientPayment.count({ where: { quoteId: quote.id } })).toBe(1);
  });
  it.each(["ACTIVE", "VOID"] as const)("preserves %s expenses and staff payments", async status => {
    const expenseFixture = await fixture();
    await db.eventExpense.create({ data: { eventId: expenseFixture.event.id, categoryId, description: "No borrar", amount: "10", currency: "ARS", expenseDate: expenseFixture.event.eventDate, createdById: actorId, status } });
    await expect(remove(expenseFixture.event)).rejects.toThrow("historial financiero");
    expect(await db.eventExpense.count({ where: { eventId: expenseFixture.event.id } })).toBe(1);
    const paymentFixture = await fixture();
    await db.staffPayment.create({ data: { eventId: paymentFixture.event.id, staffId, amount: "10", currency: "ARS", paymentDate: paymentFixture.event.eventDate, paymentMethod: "CASH", paymentType: "PARTIAL", createdById: actorId, status } });
    await expect(remove(paymentFixture.event)).rejects.toThrow("historial financiero");
    expect(await db.staffPayment.count({ where: { eventId: paymentFixture.event.id } })).toBe(1);
  });
  it("requires reopening closed finances and checks the submitted event identity", async () => {
    const { event } = await fixture();
    await expect(remove(event, { eventNumber: "otro" })).rejects.toThrow("número no coincide");
    await db.event.update({ where: { id: event.id }, data: { financialStatus: "CLOSED" } });
    await expect(remove(event)).rejects.toThrow("finanzas están cerradas");
    expect(await db.event.count({ where: { id: event.id } })).toBe(1);
  });
  it("rolls back the deletion and quote changes if the audit cannot be written", async () => {
    const { event, quote } = await fixture();
    await expect(remove(event, { actorId: randomUUID() })).rejects.toThrow();
    expect(await db.event.count({ where: { id: event.id } })).toBe(1);
    expect(await db.quote.findUnique({ where: { id: quote.id } })).toMatchObject({ status: "CONFIRMADO" });
  });
});
