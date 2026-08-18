import Decimal from "decimal.js";

Decimal.set({ precision: 40, rounding: Decimal.ROUND_HALF_UP });

export type ProfitabilityCurrency = "ARS" | "USD";
type MoneyLike = Decimal.Value;

export type ProfitabilityInput = {
  version: {
    currency: ProfitabilityCurrency;
    grossSubtotal: MoneyLike;
    itemDiscountTotal: MoneyLike;
    generalDiscountAmount: MoneyLike;
    taxableBase: MoneyLike;
    taxAmount: MoneyLike;
    totalFinal: MoneyLike;
  };
  assignments: Array<{ agreedAmount: MoneyLike; currency: ProfitabilityCurrency; active?: boolean }>;
  expenses: Array<{ amount: MoneyLike; currency: ProfitabilityCurrency; status?: "ACTIVE" | "VOID" }>;
};

export type CurrencyProfitability = {
  netSale: Decimal;
  staffCost: Decimal;
  directExpenses: Decimal;
  result: Decimal;
  marginPercentage: Decimal | null;
};

const zero = () => new Decimal(0);

export function calculateEventProfitability(input: ProfitabilityInput) {
  const byCurrency: Record<ProfitabilityCurrency, CurrencyProfitability> = {
    ARS: { netSale: zero(), staffCost: zero(), directExpenses: zero(), result: zero(), marginPercentage: null },
    USD: { netSale: zero(), staffCost: zero(), directExpenses: zero(), result: zero(), marginPercentage: null },
  };

  const saleCurrency = input.version.currency;
  byCurrency[saleCurrency].netSale = new Decimal(input.version.taxableBase).toDecimalPlaces(2);

  for (const assignment of input.assignments) {
    if (assignment.active === false) continue;
    byCurrency[assignment.currency].staffCost = byCurrency[assignment.currency].staffCost.plus(assignment.agreedAmount);
  }
  for (const expense of input.expenses) {
    if (expense.status === "VOID") continue;
    byCurrency[expense.currency].directExpenses = byCurrency[expense.currency].directExpenses.plus(expense.amount);
  }

  for (const currency of ["ARS", "USD"] as const) {
    const row = byCurrency[currency];
    row.staffCost = row.staffCost.toDecimalPlaces(2);
    row.directExpenses = row.directExpenses.toDecimalPlaces(2);
    row.result = row.netSale.minus(row.staffCost).minus(row.directExpenses).toDecimalPlaces(2);
    row.marginPercentage = row.netSale.gt(0)
      ? row.result.div(row.netSale).times(100).toDecimalPlaces(2)
      : null;
  }

  return {
    saleCurrency,
    grossSale: new Decimal(input.version.grossSubtotal).toDecimalPlaces(2),
    itemDiscounts: new Decimal(input.version.itemDiscountTotal).toDecimalPlaces(2),
    generalDiscounts: new Decimal(input.version.generalDiscountAmount).toDecimalPlaces(2),
    discounts: new Decimal(input.version.itemDiscountTotal).plus(input.version.generalDiscountAmount).toDecimalPlaces(2),
    netSale: new Decimal(input.version.taxableBase).toDecimalPlaces(2),
    tax: new Decimal(input.version.taxAmount).toDecimalPlaces(2),
    clientTotal: new Decimal(input.version.totalFinal).toDecimalPlaces(2),
    byCurrency,
  };
}

export const guestRange = (guests: number | null) => {
  if (guests == null || guests <= 0) return "Sin informar";
  if (guests <= 50) return "1–50";
  if (guests <= 100) return "51–100";
  if (guests <= 150) return "101–150";
  if (guests <= 200) return "151–200";
  return "201+";
};
