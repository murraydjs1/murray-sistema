import { Prisma } from "@prisma/client";
import { audit } from "@/server/audit/audit";

export class EventDeletionError extends Error {}

// The caller must use a serializable transaction: a concurrent payment must
// either keep its event or cause this entire deletion to roll back.
export async function deleteEventRecord(tx: Prisma.TransactionClient, input: {
  eventId: string; eventNumber: string; reason: string; actorId: string; operationId: string;
}) {
  const event = await tx.event.findUnique({
    where: { id: input.eventId },
    include: {
      staffAssignments: true, legacyFinancialData: true, excelImportRecord: true,
      sourceQuote: true,
      _count: { select: { clientPayments: true, staffPayments: true, expenses: true } },
    },
  });
  if (!event) return; // A repeated submission must not create another audit entry.
  if (event.number !== input.eventNumber) throw new EventDeletionError("El número no coincide. Volvé a abrir el evento antes de eliminarlo.");
  if (event.financialStatus === "CLOSED") throw new EventDeletionError("Las finanzas están cerradas. Primero debés reabrirlas para eliminar un evento cargado por error.");
  // Deposits may have been recorded against the quote before the event existed.
  const quotePayments = event.sourceQuoteId ? await tx.clientPayment.count({
    where: { OR: [{ quoteId: event.sourceQuoteId }, { quoteVersion: { quoteId: event.sourceQuoteId } }] },
  }) : 0;
  if (event._count.clientPayments || quotePayments || event._count.staffPayments || event._count.expenses) {
    throw new EventDeletionError("Este evento tiene cobros, pagos o gastos registrados, incluso si fueron anulados. No se puede eliminar porque debe conservarse el historial financiero. Si el evento no se hizo, usá Cancelado.");
  }

  for (const assignment of event.staffAssignments) {
    await audit(tx, {
      userId: input.actorId, action: "REMOVE", entity: "EventStaff", entityId: assignment.id,
      previousValue: snapshot(assignment), newValue: { reason: input.reason, eventDeleted: true }, operationId: input.operationId,
    });
  }
  await tx.eventStaff.deleteMany({ where: { eventId: event.id } });
  await tx.eventLegacyFinancialData.deleteMany({ where: { eventId: event.id } });
  await tx.excelImportRecord.deleteMany({ where: { eventId: event.id } });
  await tx.event.delete({ where: { id: event.id } });

  // Preserve every commercial version, but remove the confirmation so the
  // deleted event leaves receivables and can be corrected/reconfirmed later.
  if (event.sourceQuote) {
    await tx.quote.update({ where: { id: event.sourceQuote.id }, data: { status: "CONSULTA", confirmedVersionId: null } });
    await audit(tx, {
      userId: input.actorId, action: "UNCONFIRM_FOR_EVENT_DELETION", entity: "Quote", entityId: event.sourceQuote.id,
      previousValue: { status: event.sourceQuote.status, confirmedVersionId: event.sourceQuote.confirmedVersionId },
      newValue: { status: "CONSULTA", confirmedVersionId: null, deletedEventId: event.id, reason: input.reason }, operationId: input.operationId,
    });
  }
  await audit(tx, {
    userId: input.actorId, action: "DELETE", entity: "Event", entityId: event.id,
    previousValue: snapshot(event), newValue: { reason: input.reason }, operationId: input.operationId,
  });
}

function snapshot(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value));
}
