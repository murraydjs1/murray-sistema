import Decimal from "decimal.js";

type Currency = "ARS" | "USD";
type Legacy = { saleArs: Decimal.Value | null; saleUsd: Decimal.Value | null; depositArs: Decimal.Value | null; depositUsd: Decimal.Value | null };
type Payment = { amount: Decimal.Value; currency: Currency; status: string };

// The imported deposit is an opening reference, never a newly received payment.
export function legacyCollection(legacy: Legacy, payments: Payment[], currency: Currency) {
  const sale = currency === "ARS" ? legacy.saleArs : legacy.saleUsd;
  const deposit = new Decimal((currency === "ARS" ? legacy.depositArs : legacy.depositUsd) ?? 0);
  const recorded = payments.filter(p => p.status === "ACTIVE" && p.currency === currency)
    .reduce((sum, p) => sum.plus(p.amount), new Decimal(0));
  const paid = deposit.plus(recorded);
  const total = sale === null ? null : new Decimal(sale);
  return { currency, total, deposit, recorded, paid, pending: total?.minus(paid) ?? null };
}

export function legacyCollections(legacy: Legacy, payments: Payment[]) {
  return (["ARS", "USD"] as const).map(currency => legacyCollection(legacy, payments, currency))
    .filter(row => row.total !== null || !row.deposit.isZero() || payments.some(p => p.currency === row.currency));
}
