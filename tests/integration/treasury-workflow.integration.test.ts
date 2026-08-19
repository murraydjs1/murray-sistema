import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";

import { accountBalance, clientAccount } from "@/lib/treasury/calculations";

const db = new PrismaClient();
const run = process.env.RUN_DB_INTEGRATION === "true";
let userId = "";
let accountIds: string[] = [];
const transactionIds: string[] = [];

describe.runIf(run)("Sprint 4 treasury ledger with PostgreSQL", () => {
  beforeAll(async () => {
    userId = (await db.user.findFirstOrThrow({ where: { role: "ADMIN" } })).id;
    const suffix = Date.now();
    const accounts = await Promise.all([
      db.financialAccount.create({ data: { name: `Integration MP ${suffix}`, type: "MERCADO_PAGO", currency: "ARS" } }),
      db.financialAccount.create({ data: { name: `Integration Galicia ${suffix}`, type: "BANK", currency: "ARS" } }),
      db.financialAccount.create({ data: { name: `Integration USD ${suffix}`, type: "BANK", currency: "USD" } }),
      db.financialAccount.create({ data: { name: `Integration Party ${suffix}`, type: "THIRD_PARTY", currency: "ARS", includeInAvailableCash: false } }),
    ]);
    accountIds = accounts.map((account) => account.id);
  });
  afterAll(async () => {
    await db.auditLog.deleteMany({ where: { entityId: { in: transactionIds } } });
    await db.treasuryTransaction.deleteMany({ where: { accountId: { in: accountIds } } });
    await db.financialAccount.deleteMany({ where: { id: { in: accountIds } } });
    await db.$disconnect();
  });

  it("reconcilia opening, cobro, pago y transferencia sin inflar el total", async () => {
    const movements = [
      { accountId: accountIds[0], direction: "INFLOW" as const, category: "OPENING_BALANCE" as const, amount: "2000000", description: "Opening" },
      { accountId: accountIds[1], direction: "INFLOW" as const, category: "OPENING_BALANCE" as const, amount: "1000000", description: "Opening" },
      { accountId: accountIds[0], direction: "INFLOW" as const, category: "CLIENT_PAYMENT" as const, amount: "2875000", description: "Seña" },
      { accountId: accountIds[0], direction: "OUTFLOW" as const, category: "STAFF_PAYMENT" as const, amount: "150000", description: "Pago staff" },
      { accountId: accountIds[0], direction: "OUTFLOW" as const, category: "TRANSFER" as const, amount: "500000", description: "Transferencia" },
      { accountId: accountIds[1], direction: "INFLOW" as const, category: "TRANSFER" as const, amount: "500000", description: "Transferencia" },
    ];
    for (const movement of movements) {
      const row = await db.treasuryTransaction.create({ data: { ...movement, currency: "ARS", transactionDate: new Date("2026-08-19T00:00:00Z"), referenceType: "Integration", referenceId: randomUUID(), createdById: userId, idempotencyKey: randomUUID() } });
      transactionIds.push(row.id);
    }
    const rows = await db.treasuryTransaction.findMany({ where: { id: { in: transactionIds } } });
    const total = accountBalance(rows.map((row) => ({ amount: String(row.amount), direction: row.direction, status: row.status })));
    expect(total.toFixed(2)).toBe("5725000.00");
    expect(clientAccount("5750000", [{ amount: "2875000" }]).pending.toFixed(2)).toBe("2875000.00");
  });

  it("mantiene fondos de terceros fuera de cuentas Murray y garantiza idempotencia", async () => {
    const key = randomUUID();
    const payment = await db.treasuryTransaction.create({ data: { accountId: accountIds[3], direction: "INFLOW", category: "CLIENT_PAYMENT", amount: "1000000", currency: "ARS", transactionDate: new Date("2026-08-19T00:00:00Z"), description: "Party Express", referenceType: "Integration", referenceId: randomUUID(), createdById: userId, idempotencyKey: key } });
    transactionIds.push(payment.id);
    await expect(db.treasuryTransaction.create({ data: { accountId: accountIds[3], direction: "INFLOW", category: "CLIENT_PAYMENT", amount: "1000000", currency: "ARS", transactionDate: new Date("2026-08-19T00:00:00Z"), description: "Duplicado", referenceType: "Integration", referenceId: randomUUID(), createdById: userId, idempotencyKey: key } })).rejects.toThrow();
    const party = await db.financialAccount.findUniqueOrThrow({ where: { id: accountIds[3] } });
    expect(party.includeInAvailableCash).toBe(false);
  });
});
