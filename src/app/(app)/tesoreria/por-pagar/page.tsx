import Link from "next/link";
import { Currency } from "@prisma/client";

import { formatMoney } from "@/lib/money/format";
import { treasurySummary } from "@/server/treasury/summary";
import { requireManagement } from "@/server/auth/authorization";
import { payReimbursement } from "@/app/actions/treasury";

export default async function PayablesPage() {
  await requireManagement();
  const summary = await treasurySummary();
  const today = new Date().toISOString().slice(0, 10);
  return <><div className="topbar"><div><div className="eyebrow">Tesorería</div><h1>Por pagar</h1><p className="muted">Obligaciones exigibles y compromisos futuros, sin duplicar pagos.</p></div><Link className="btn btn-secondary" href="/tesoreria">Volver</Link></div>{Object.values(Currency).map((currency) => { const bucket = summary.buckets[currency]; const accounts = summary.accounts.filter((x) => x.currency === currency && x.active); const reimbursements = summary.reimbursements.filter((x) => x.currency === currency); return <section key={currency}><div className="section-head"><h2>{currency}</h2></div><div className="grid grid-3 metrics"><div className="card metric"><span>Personal exigible</span><strong>{formatMoney(bucket.staffPayable.toFixed(2), currency)}</strong></div><div className="card metric"><span>Reintegros pendientes</span><strong>{formatMoney(bucket.reimbursementTotal.toFixed(2), currency)}</strong></div><div className="card metric"><span>Comprometido futuro</span><strong>{formatMoney(bucket.futureCommitted.toFixed(2), currency)}</strong></div></div><div className="stack">{reimbursements.map((item) => <article className="card" key={item.id}><div className="row space"><div><strong>Reintegro · {item.staff.name}</strong><p className="muted">{item.eventExpense ? `${item.eventExpense.event.number} · ${item.eventExpense.description}` : item.generalExpense?.description ?? "Gasto general"}</p></div><strong>{formatMoney(String(item.amount), currency)}</strong></div><form action={payReimbursement.bind(null, item.id)} className="row"><select name="accountId" aria-label="Cuenta de pago" required><option value="">Cuenta</option>{accounts.map((account) => <option value={account.id} key={account.id}>{account.name}</option>)}</select><input name="paidAt" type="date" defaultValue={today} aria-label="Fecha" required/><input type="hidden" name="idempotencyKey" value={crypto.randomUUID()}/><button className="btn btn-primary">Reintegrar</button></form></article>)}</div></section>; })}</>;
}
