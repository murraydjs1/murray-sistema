"use server";
import { randomUUID } from "node:crypto";
import { requireManagement } from "@/server/auth/authorization";
import { createClientPayment } from "@/app/actions/treasury";
import { createStaffPayment } from "@/app/actions/staff-payments";

export async function recordDashboardPayment(previous: { message: string; success: boolean; operationId: string }, data: FormData) {
  await requireManagement();
  data.set("idempotencyKey", previous.operationId);
  try {
    const staffId = String(data.get("staffId") || "");
    if (staffId) await createStaffPayment(staffId, data);
    else await createClientPayment(data);
    return { message: "Movimiento registrado. Los saldos están actualizados.", success: true, operationId: randomUUID() };
  } catch {
    return { ...previous, message: "No se pudo registrar. Revisá el importe y la fecha antes de reintentar.", success: false };
  }
}
