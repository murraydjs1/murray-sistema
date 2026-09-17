import Decimal from "decimal.js";
import { clientAccount } from "@/lib/treasury/calculations";

type Currency = "ARS" | "USD";
type Amount = Decimal.Value;
export function previousWeek(now = new Date()) {
  const civil = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Buenos_Aires", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
  const today = new Date(`${civil}T00:00:00.000Z`);
  const end = new Date(today);
  end.setUTCDate(end.getUTCDate() - (end.getUTCDay() + 6) % 7);
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - 7);
  return { today, start, end };
}

export function collectionBalance(version: { currency: Currency; totalFinal: Amount }, payments: Array<{ currency: Currency; amount: Amount; status: string }>) {
  return clientAccount(new Decimal(version.totalFinal), payments.filter(p => p.currency === version.currency).map(p => ({ ...p, amount: new Decimal(p.amount) })));
}

// Keep each person's balance separate: an overpayment to one person cannot pay another.
export function eventStaffBalances(assignments: Array<{ staffId: string; currency: Currency; agreedAmount: Amount; active: boolean; staff: { name: string } }>, payments: Array<{ staffId: string; currency: Currency; amount: Amount; status: string }>) {
  const rows = new Map<string, { staffId: string; name: string; currency: Currency; agreed: Decimal; paid: Decimal; pending: Decimal }>();
  for (const a of assignments.filter(a => a.active)) {
    const key = `${a.staffId}:${a.currency}`;
    const row = rows.get(key) ?? { staffId: a.staffId, name: a.staff.name, currency: a.currency, agreed: new Decimal(0), paid: new Decimal(0), pending: new Decimal(0) };
    row.agreed = row.agreed.plus(a.agreedAmount);
    rows.set(key, row);
  }
  for (const p of payments.filter(p => p.status === "ACTIVE")) {
    const row = rows.get(`${p.staffId}:${p.currency}`);
    if (row) row.paid = row.paid.plus(p.amount);
  }
  return [...rows.values()].map(row => ({ ...row, pending: Decimal.max(row.agreed.minus(row.paid), 0) }));
}
