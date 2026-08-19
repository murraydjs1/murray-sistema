"use server";

import { randomUUID } from "node:crypto";
import { Currency, ExpensePaymentMethod, GeneralExpenseType } from "@prisma/client";
import Decimal from "decimal.js";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { audit } from "@/server/audit/audit";
import { requireManagement } from "@/server/auth/authorization";
import { prisma } from "@/server/db/prisma";
import { createLedgerMovement, voidLedgerMovement } from "@/server/treasury/ledger";

const uuid = z.string().uuid();
const text = (data: FormData, key: string) => String(data.get(key) ?? "").trim();
const optional = (data: FormData, key: string) => text(data, key) || null;
const refresh = () => { revalidatePath("/gastos"); revalidatePath("/tesoreria"); revalidatePath("/tesoreria/por-pagar"); };

export async function createGeneralExpense(data: FormData) {
  const actor = await requireManagement();
  const input = z.object({
    categoryId: uuid,
    description: z.string().min(1),
    amount: z.string().transform((value) => new Decimal(value)).refine((value) => value.gt(0)),
    currency: z.nativeEnum(Currency),
    expenseDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).transform((value) => new Date(`${value}T00:00:00.000Z`)),
    type: z.nativeEnum(GeneralExpenseType),
    idempotencyKey: uuid,
  }).parse({ categoryId: text(data, "categoryId"), description: text(data, "description"), amount: text(data, "amount"), currency: text(data, "currency"), expenseDate: text(data, "expenseDate"), type: text(data, "type"), idempotencyKey: text(data, "idempotencyKey") });
  const accountId = optional(data, "accountId");
  const paidByStaffId = optional(data, "paidByStaffId");
  if (accountId === null && paidByStaffId === null) throw new Error("Indicá la cuenta Murray o quién pagó");
  if (accountId && paidByStaffId) throw new Error("Elegí cuenta Murray o personal, no ambos");
  await prisma.$transaction(async (tx) => {
    if (await tx.generalExpense.findUnique({ where: { idempotencyKey: input.idempotencyKey } })) return;
    await tx.expenseCategory.findFirstOrThrow({ where: { id: input.categoryId, active: true, scope: { in: ["GENERAL", "BOTH"] } } });
    if (paidByStaffId) await tx.staff.findFirstOrThrow({ where: { id: paidByStaffId, active: true } });
    const id = randomUUID();
    let treasuryTransactionId: string | null = null;
    if (accountId) {
      const movement = await createLedgerMovement(tx, { accountId, direction: "OUTFLOW", category: input.type === "INVESTMENT" ? "INVESTMENT" : "GENERAL_EXPENSE", amount: input.amount, currency: input.currency, date: input.expenseDate, description: `${input.type === "INVESTMENT" ? "Inversión" : "Gasto general"} · ${input.description}`, referenceType: "GeneralExpense", referenceId: id, createdById: actor.id });
      treasuryTransactionId = movement.id;
    }
    const expense = await tx.generalExpense.create({ data: { id, categoryId: input.categoryId, description: input.description, amount: input.amount.toFixed(2), currency: input.currency, expenseDate: input.expenseDate, type: input.type, accountId, paidByStaffId, paymentMethod: optional(data, "paymentMethod") as ExpensePaymentMethod | null, notes: optional(data, "notes"), idempotencyKey: input.idempotencyKey, treasuryTransactionId, createdById: actor.id } });
    let reimbursementId: string | null = null;
    if (paidByStaffId) {
      const reimbursement = await tx.staffReimbursement.create({ data: { staffId: paidByStaffId, generalExpenseId: id, amount: input.amount.toFixed(2), currency: input.currency, notes: `Reintegro pendiente · ${input.description}`, idempotencyKey: randomUUID(), createdById: actor.id } });
      reimbursementId = reimbursement.id;
      await audit(tx, { userId: actor.id, action: "CREATE", entity: "StaffReimbursement", entityId: reimbursement.id, newValue: { generalExpenseId: id, staffId: paidByStaffId, amount: input.amount.toFixed(2), currency: input.currency }, operationId: input.idempotencyKey });
    }
    await audit(tx, { userId: actor.id, action: "CREATE", entity: "GeneralExpense", entityId: id, newValue: { amount: String(expense.amount), currency: expense.currency, type: expense.type, accountId, paidByStaffId, reimbursementId }, operationId: input.idempotencyKey });
  });
  refresh();
}

export async function voidGeneralExpense(id: string, data: FormData) {
  const actor = await requireManagement();
  const reason = text(data, "voidReason");
  if (!reason) throw new Error("Indicá el motivo de anulación");
  await prisma.$transaction(async (tx) => {
    const old = await tx.generalExpense.findUniqueOrThrow({ where: { id }, include: { reimbursement: true } });
    if (old.status === "VOID") return;
    await tx.generalExpense.update({ where: { id }, data: { status: "VOID", voidedAt: new Date(), voidedById: actor.id, voidReason: reason } });
    if (old.treasuryTransactionId) await voidLedgerMovement(tx, old.treasuryTransactionId, actor.id, reason);
    if (old.reimbursement?.status === "PENDING") {
      await tx.staffReimbursement.update({ where: { id: old.reimbursement.id }, data: { status: "VOID", voidedAt: new Date(), voidedById: actor.id, voidReason: reason } });
      await audit(tx, { userId: actor.id, action: "VOID", entity: "StaffReimbursement", entityId: old.reimbursement.id, previousValue: { status: "PENDING" }, newValue: { status: "VOID", reason }, operationId: randomUUID() });
    }
    await audit(tx, { userId: actor.id, action: "VOID", entity: "GeneralExpense", entityId: id, previousValue: { status: old.status }, newValue: { status: "VOID", reason }, operationId: randomUUID() });
  });
  refresh();
}
