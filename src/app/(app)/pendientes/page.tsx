import Link from "next/link";
import { OperationsOverview } from "@/components/dashboard/operations-overview";
import { requireManagement } from "@/server/auth/authorization";

export default async function PendingOperations() {
  await requireManagement();
  return <>
    <div className="topbar">
      <div><div className="eyebrow">Operación</div><h1>Pendientes</h1><p className="muted">Revisá la semana anterior, registrá cobros y pagos y completá los cierres.</p></div>
      <Link className="btn btn-secondary" href="/dashboard">Ver dashboard</Link>
    </div>
    <OperationsOverview />
  </>;
}
