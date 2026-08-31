import "server-only";

import { Currency, PaymentStatus } from "@prisma/client";
import Decimal from "decimal.js";

import { calculateEventProfitability } from "@/lib/profitability/event-profitability";
import { prisma } from "@/server/db/prisma";

const zero = () => new Decimal(0);

export async function operationalFinanceSummary() {
  const [events, reimbursements] = await Promise.all([
    prisma.event.findMany({
      where: { status: { not: "CANCELADO" }, sourceQuoteId: { not: null }, sourceQuoteVersionId: { not: null } },
      include: {
        eventType: true,
        sourceQuoteVersion: true,
        sourceQuote: { include: { client: true, payments: { where: { status: PaymentStatus.ACTIVE }, orderBy: { paymentDate: "desc" } } } },
        staffAssignments: { where: { active: true }, include: { staff: true }, orderBy: { createdAt: "asc" } },
        staffPayments: { where: { status: PaymentStatus.ACTIVE } },
        expenses: { where: { status: "ACTIVE" } },
      },
      orderBy: [{ eventDate: "asc" }, { number: "asc" }],
    }),
    prisma.staffReimbursement.findMany({
      where: { status: "PENDING" },
      include: { staff: true, eventExpense: { include: { event: true } }, generalExpense: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const rows = events.flatMap((event) => {
    if (!event.sourceQuote || !event.sourceQuoteVersion) return [];
    const version = event.sourceQuoteVersion;
    const collected = event.sourceQuote.payments.reduce((sum, payment) => sum.plus(payment.amount), zero());
    const pendingCollection = Decimal.max(new Decimal(version.totalFinal).minus(collected), 0);
    const paidByStaff = new Map<string, Decimal>();
    for (const payment of event.staffPayments) {
      const key = `${payment.staffId}:${payment.currency}`;
      paidByStaff.set(key, (paidByStaff.get(key) || zero()).plus(payment.amount));
    }
    const staffPayables = event.staffAssignments.map((assignment) => {
      const key = `${assignment.staffId}:${assignment.currency}`;
      const available = paidByStaff.get(key) || zero();
      const agreed = new Decimal(assignment.agreedAmount);
      const paid = Decimal.min(agreed, available);
      paidByStaff.set(key, available.minus(paid));
      return { assignment, paid, pending: agreed.minus(paid) };
    });
    const profit = calculateEventProfitability({ version, assignments: event.staffAssignments, expenses: event.expenses });
    return [{ event, version, collected, pendingCollection, staffPayables, profit }];
  });

  const buckets = Object.fromEntries(Object.values(Currency).map((currency) => {
    const receivable = rows.filter((row) => row.version.currency === currency).reduce((sum, row) => sum.plus(row.pendingCollection), zero());
    const staffPayable = rows.flatMap((row) => row.staffPayables).filter((row) => row.assignment.currency === currency).reduce((sum, row) => sum.plus(row.pending), zero());
    const reimbursementPayable = reimbursements.filter((item) => item.currency === currency).reduce((sum, item) => sum.plus(item.amount), zero());
    const cost = rows.reduce((sum, row) => sum.plus(row.profit.byCurrency[currency].staffCost).plus(row.profit.byCurrency[currency].directExpenses), zero());
    const projectedResult = rows.reduce((sum, row) => sum.plus(row.profit.byCurrency[currency].result), zero());
    return [currency, { receivable, staffPayable, reimbursementPayable, payable: staffPayable.plus(reimbursementPayable), cost, projectedResult }];
  })) as Record<Currency, { receivable: Decimal; staffPayable: Decimal; reimbursementPayable: Decimal; payable: Decimal; cost: Decimal; projectedResult: Decimal }>;

  return { rows, reimbursements, buckets };
}
