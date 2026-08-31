import "server-only";

import { Currency, PaymentStatus } from "@prisma/client";
import Decimal from "decimal.js";

import { calculateEventProfitability } from "@/lib/profitability/event-profitability";
import { prisma } from "@/server/db/prisma";

const zero = () => new Decimal(0);

type FinanceRow = {
  event: Awaited<ReturnType<typeof readEvents>>[number];
  currency: Currency;
  total: Decimal;
  collected: Decimal;
  pendingCollection: Decimal;
  cost: Decimal;
  result: Decimal;
  paymentDueDate: Date | null;
  isLegacy: boolean;
  staffPayables: Array<{ assignment: Awaited<ReturnType<typeof readEvents>>[number]["staffAssignments"][number]; paid: Decimal; pending: Decimal }>;
};

async function readEvents() {
  return prisma.event.findMany({
    where: { status: { not: "CANCELADO" } },
    include: {
      client: true,
      legacyFinancialData: true,
      sourceQuoteVersion: true,
      sourceQuote: { include: { payments: { where: { status: PaymentStatus.ACTIVE }, orderBy: { paymentDate: "desc" } } } },
      staffAssignments: { where: { active: true }, include: { staff: true }, orderBy: { createdAt: "asc" } },
      staffPayments: { where: { status: PaymentStatus.ACTIVE } },
      expenses: { where: { status: "ACTIVE" } },
    },
    orderBy: [{ eventDate: "asc" }, { number: "asc" }],
  });
}

function staffPayablesFor(event: Awaited<ReturnType<typeof readEvents>>[number]) {
  const paidByStaff = new Map<string, Decimal>();
  for (const payment of event.staffPayments) {
    const key = `${payment.staffId}:${payment.currency}`;
    paidByStaff.set(key, (paidByStaff.get(key) || zero()).plus(payment.amount));
  }
  return event.staffAssignments.map((assignment) => {
    const key = `${assignment.staffId}:${assignment.currency}`;
    const available = paidByStaff.get(key) || zero();
    const agreed = new Decimal(assignment.agreedAmount);
    const paid = Decimal.min(agreed, available);
    paidByStaff.set(key, available.minus(paid));
    return { assignment, paid, pending: agreed.minus(paid) };
  });
}

export async function operationalFinanceSummary() {
  const [events, reimbursements] = await Promise.all([
    readEvents(),
    prisma.staffReimbursement.findMany({
      where: { status: "PENDING" },
      include: { staff: true, eventExpense: { include: { event: true } }, generalExpense: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const rows: FinanceRow[] = events.flatMap((event): FinanceRow[] => {
    const staffPayables = staffPayablesFor(event);
    const legacy = event.legacyFinancialData;

    if (legacy) {
      return Object.values(Currency).flatMap((currency) => {
        const values = currency === Currency.ARS
          ? { sale: legacy.saleArs, deposit: legacy.depositArs, cost: legacy.costArs, result: legacy.resultArs }
          : { sale: legacy.saleUsd, deposit: legacy.depositUsd, cost: legacy.costUsd, result: legacy.resultUsd };
        const total = new Decimal(values.sale ?? 0);
        const collected = new Decimal(values.deposit ?? 0);
        const cost = new Decimal(values.cost ?? 0);
        const result = values.result === null ? total.minus(cost) : new Decimal(values.result);
        const hasFinancialData = !total.isZero() || !collected.isZero() || !cost.isZero() || !result.isZero()
          || staffPayables.some((item) => item.assignment.currency === currency);
        if (!hasFinancialData) return [];
        return [{
          event,
          currency,
          total,
          collected,
          pendingCollection: Decimal.max(total.minus(collected), 0),
          cost,
          result,
          paymentDueDate: null,
          isLegacy: true,
          staffPayables,
        }];
      });
    }

    const version = event.sourceQuoteVersion;
    if (!event.sourceQuote || !version) return [];
    const collected = event.sourceQuote.payments
      .filter((payment) => payment.currency === version.currency)
      .reduce((sum, payment) => sum.plus(payment.amount), zero());
    const profit = calculateEventProfitability({ version, assignments: event.staffAssignments, expenses: event.expenses }).byCurrency[version.currency];
    return [{
      event,
      currency: version.currency,
      total: new Decimal(version.totalFinal),
      collected,
      pendingCollection: Decimal.max(new Decimal(version.totalFinal).minus(collected), 0),
      cost: profit.staffCost.plus(profit.directExpenses),
      result: profit.result,
      paymentDueDate: event.sourceQuote.paymentDueDate,
      isLegacy: false,
      staffPayables,
    }];
  });

  const buckets = Object.fromEntries(Object.values(Currency).map((currency) => {
    const currencyRows = rows.filter((row) => row.currency === currency);
    const receivable = currencyRows.reduce((sum, row) => sum.plus(row.pendingCollection), zero());
    const staffPayable = rows
      .flatMap((row) => row.staffPayables.filter((item) => item.assignment.currency === row.currency))
      .filter((row) => row.assignment.currency === currency)
      .reduce((sum, row) => sum.plus(row.pending), zero());
    const reimbursementPayable = reimbursements.filter((item) => item.currency === currency).reduce((sum, item) => sum.plus(item.amount), zero());
    const cost = currencyRows.reduce((sum, row) => sum.plus(row.cost), zero());
    const projectedResult = currencyRows.reduce((sum, row) => sum.plus(row.result), zero());
    return [currency, { receivable, staffPayable, reimbursementPayable, payable: staffPayable.plus(reimbursementPayable), cost, projectedResult }];
  })) as Record<Currency, { receivable: Decimal; staffPayable: Decimal; reimbursementPayable: Decimal; payable: Decimal; cost: Decimal; projectedResult: Decimal }>;

  return { rows, reimbursements, buckets };
}
