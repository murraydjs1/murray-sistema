import Link from "next/link";
import { Currency } from "@prisma/client";

import { formatMoney } from "@/lib/money/format";
import { requireManagement } from "@/server/auth/authorization";
import { operationalFinanceSummary } from "@/server/finance/operational-summary";

export default async function TreasuryPage() {
  await requireManagement();
  const summary = await operationalFinanceSummary();
  const pendingCollections = summary.rows.filter((row) => row.pendingCollection.gt(0));
  const pendingPayments = summary.rows.flatMap((row) => row.staffPayables.filter((item) => item.assignment.currency === row.currency && item.pending.gt(0)).map((item) => ({ event: row.event, ...item })));

  return <>
    <div className="topbar"><div><div className="eyebrow">Finanzas operativas</div><h1>Finanzas</h1><p className="muted">Cobros de clientes, pagos de equipo y resultado proyectado de cada evento.</p></div><div className="row"><Link className="btn btn-secondary" href="/tesoreria/por-cobrar">Cobros</Link><Link className="btn btn-primary" href="/tesoreria/por-pagar">Pagos</Link></div></div>
    {Object.values(Currency).map((currency) => { const bucket = summary.buckets[currency]; return <section key={currency}><div className="section-head"><h2>{currency}</h2></div><div className="grid grid-4 treasury-metrics operational-metrics">
      <Metric href="/tesoreria/por-cobrar" label="Por cobrar" value={formatMoney(bucket.receivable.toFixed(2), currency)} detail="Saldos de clientes" />
      <Metric href="/tesoreria/por-pagar" label="Por pagar" value={formatMoney(bucket.payable.toFixed(2), currency)} detail="DJ, técnicos y reintegros" />
      <Metric href="/reportes/rentabilidad" label="Costos cargados" value={formatMoney(bucket.cost.toFixed(2), currency)} detail="Personal y gastos directos" />
      <Metric href="/reportes/rentabilidad" label="Resultado proyectado" value={formatMoney(bucket.projectedResult.toFixed(2), currency)} detail="Venta neta menos costos" accent />
    </div></section>; })}
    <div className="finance-note">Los valores se muestran separados por moneda. Los eventos importados conservan sus importes históricos de Excel; los nuevos se calculan con el detalle operativo cargado.</div>
    <section className="grid grid-2 finance-worklist">
      <Worklist title="Cobros a seguir" href="/tesoreria/por-cobrar" empty="No hay saldos pendientes" items={pendingCollections.slice(0, 6).map((row) => ({ href: `/eventos/${row.event.id}`, title: `${row.event.number} · ${row.event.client.name}`, detail: `${row.event.eventDate.toLocaleDateString("es-AR", { timeZone: "UTC" })} · ${row.event.venue}`, value: formatMoney(row.pendingCollection.toFixed(2), row.currency) }))} />
      <Worklist title="Pagos a coordinar" href="/tesoreria/por-pagar" empty="No hay pagos pendientes" items={pendingPayments.slice(0, 6).map((row) => ({ href: `/eventos/${row.event.id}`, title: `${row.assignment.staff.name} · ${row.event.number}`, detail: `${row.assignment.assignmentType.replaceAll("_", " ")} · ${row.event.eventDate.toLocaleDateString("es-AR", { timeZone: "UTC" })}`, value: formatMoney(row.pending.toFixed(2), row.assignment.currency) }))} />
    </section>
  </>;
}

function Metric({ href, label, value, detail, accent = false }: { href: string; label: string; value: string; detail: string; accent?: boolean }) { return <Link href={href} className={`card card-interactive metric ${accent ? "metric-result" : ""}`}><span>{label}</span><strong>{value}</strong><small>{detail} →</small></Link>; }
function Worklist({ title, href, empty, items }: { title: string; href: string; empty: string; items: Array<{ href: string; title: string; detail: string; value: string }> }) { return <section className="card finance-worklist-card"><div className="row space"><h2>{title}</h2><Link href={href} className="text-link">Ver todo</Link></div>{items.length ? <div className="stack">{items.map((item) => <Link className="finance-row" href={item.href} key={`${item.href}-${item.title}`}><span><strong>{item.title}</strong><small>{item.detail}</small></span><strong>{item.value}</strong></Link>)}</div> : <p className="muted">{empty}</p>}</section>; }
