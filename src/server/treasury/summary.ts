import "server-only";

import { Currency, Prisma } from "@prisma/client";
import Decimal from "decimal.js";

import { accountBalance, clientAccount, reservedTax, treasuryAvailability } from "@/lib/treasury/calculations";
import { prisma } from "@/server/db/prisma";

export async function treasurySummary() {
  const [accounts, receivableQuotes, assignments, payments, reimbursements, settings] = await Promise.all([
    prisma.financialAccount.findMany({ where: { active: true }, include: { transactions: { where: { status: "ACTIVE" } } }, orderBy: { name: "asc" } }),
    prisma.quote.findMany({ where: { status: { in: ["CONFIRMADO", "REALIZADO", "CERRADO"] }, confirmedVersionId: { not: null } }, include: { client: true, event: true, confirmedVersion: true, payments: { where: { status: "ACTIVE" } } }, orderBy: { eventDate: "asc" } }),
    prisma.eventStaff.findMany({ where: { active: true, event: { status: { in: ["REALIZADO", "CERRADO", "CONFIRMADO", "EN_PREPARACION", "LISTO", "EN_CURSO"] } } }, include: { event: true, staff: true } }),
    prisma.staffPayment.findMany({ where: { status: "ACTIVE" } }),
    prisma.staffReimbursement.findMany({ where: { status: "PENDING" }, include: { staff: true, eventExpense: { include: { event: true } }, generalExpense: true } }),
    prisma.financialSetting.findMany(),
  ]);

  const balances = accounts.map((account) => ({
    ...account,
    balance: accountBalance(account.transactions.map((transaction) => ({ amount: String(transaction.amount), direction: transaction.direction, status: transaction.status, category: transaction.category }))),
  }));
  const receivables = receivableQuotes.map((quote) => {
    const version = quote.confirmedVersion!;
    return { quote, event: quote.event, client: quote.client, version, ...clientAccount(String(version.totalFinal), quote.payments.map((payment) => ({ amount: String(payment.amount), status: payment.status }))) };
  });

  const bucketEntries = Object.values(Currency).map((currency) => {
    const currencyAccounts = balances.filter((account) => account.currency === currency);
    const availableCash = currencyAccounts.filter((account) => account.includeInAvailableCash && account.type !== "THIRD_PARTY").reduce((sum, account) => sum.plus(account.balance), new Decimal(0));
    const thirdParty = currencyAccounts.filter((account) => account.type === "THIRD_PARTY").reduce((sum, account) => sum.plus(account.balance), new Decimal(0));
    const dueAssignments = assignments.filter((assignment) => assignment.currency === currency && ["REALIZADO", "CERRADO"].includes(assignment.event.status));
    const futureAssignments = assignments.filter((assignment) => assignment.currency === currency && ["CONFIRMADO", "EN_PREPARACION", "LISTO", "EN_CURSO"].includes(assignment.event.status));
    const dueEventIds = new Set(dueAssignments.map((assignment) => assignment.eventId));
    const staffGenerated = dueAssignments.reduce((sum, assignment) => sum.plus(assignment.agreedAmount), new Decimal(0));
    const staffPaid = payments.filter((payment) => payment.currency === currency && payment.eventId && dueEventIds.has(payment.eventId)).reduce((sum, payment) => sum.plus(payment.amount), new Decimal(0));
    const advances = payments.filter((payment) => payment.currency === currency && !payment.eventId).reduce((sum, payment) => sum.plus(payment.amount), new Decimal(0));
    const staffPayable = Decimal.max(staffGenerated.minus(staffPaid).minus(advances), 0);
    const reimbursementTotal = reimbursements.filter((reimbursement) => reimbursement.currency === currency).reduce((sum, reimbursement) => sum.plus(reimbursement.amount), new Decimal(0));
    const futureCommitted = futureAssignments.reduce((sum, assignment) => sum.plus(assignment.agreedAmount), new Decimal(0));
    const taxReserve = receivables.filter((receivable) => receivable.version.currency === currency).reduce((sum, receivable) => sum.plus(reservedTax(String(receivable.version.totalFinal), String(receivable.version.taxAmount), receivable.paid)), new Decimal(0));
    const minimumReserve = new Decimal(settings.find((setting) => setting.currency === currency)?.minimumCashReserve ?? 0);
    const availability = treasuryAvailability({ availableCash, payable: staffPayable, reimbursements: reimbursementTotal, reservedTax: taxReserve, minimumReserve });
    const receivable = receivables.filter((item) => item.version.currency === currency).reduce((sum, item) => sum.plus(Decimal.max(item.pending, 0)), new Decimal(0));
    return [currency, { availableCash, thirdParty, receivable, staffPayable, reimbursementTotal, payable: staffPayable.plus(reimbursementTotal), futureCommitted, taxReserve, minimumReserve, ...availability }] as const;
  });

  return { accounts: balances, receivables, reimbursements, buckets: Object.fromEntries(bucketEntries) };
}

export async function cashFlow(start: Date, end: Date, currency: Currency) {
  const accounts = await prisma.financialAccount.findMany({ where: { active: true, currency, includeInAvailableCash: true, type: { not: "THIRD_PARTY" } }, select: { id: true } });
  const accountIds = accounts.map((account) => account.id);
  const [before, period] = await Promise.all([
    prisma.treasuryTransaction.findMany({ where: { accountId: { in: accountIds }, currency, status: "ACTIVE", transactionDate: { lt: start } } }),
    prisma.treasuryTransaction.findMany({ where: { accountId: { in: accountIds }, currency, status: "ACTIVE", transactionDate: { gte: start, lte: end } }, orderBy: { transactionDate: "asc" } }),
  ]);
  const opening = accountBalance(before.map((transaction) => ({ amount: String(transaction.amount), direction: transaction.direction })));
  const external = period.filter((transaction) => transaction.category !== "TRANSFER");
  const inflows = external.filter((transaction) => transaction.direction === "INFLOW").reduce((sum, transaction) => sum.plus(transaction.amount), new Decimal(0));
  const outflows = external.filter((transaction) => transaction.direction === "OUTFLOW").reduce((sum, transaction) => sum.plus(transaction.amount), new Decimal(0));
  return { opening, inflows, outflows, closing: opening.plus(inflows).minus(outflows), period };
}

export type TreasurySummary = Prisma.PromiseReturnType<typeof treasurySummary>;
