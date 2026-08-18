import type { Prisma } from "@prisma/client";
export async function audit(tx: Prisma.TransactionClient, data: { userId?: string; action: string; entity: string; entityId: string; previousValue?: Prisma.InputJsonValue; newValue?: Prisma.InputJsonValue; operationId: string }) {
  await tx.auditLog.create({ data });
}
