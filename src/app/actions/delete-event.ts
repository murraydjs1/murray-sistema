"use server";

import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireManagement } from "@/server/auth/authorization";
import { prisma } from "@/server/db/prisma";
import { deleteEventRecord, EventDeletionError } from "@/server/events/delete-event";

export async function deleteEvent(_previous: { error: string }, data: FormData) {
  const actor = await requireManagement();
  const parsed = z.object({
    eventId: z.string().uuid(), eventNumber: z.string().trim().min(1), reason: z.string().trim().min(3).max(500),
  }).safeParse(Object.fromEntries(data));
  if (!parsed.success) return { error: "Indicá un motivo de entre 3 y 500 caracteres." };
  try {
    await prisma.$transaction(tx => deleteEventRecord(tx, { ...parsed.data, actorId: actor.id, operationId: randomUUID() }), {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });
  } catch (error) {
    return { error: error instanceof EventDeletionError ? error.message : "No se pudo eliminar el evento. Puede haber cambiado mientras lo revisabas. Recargá la página e intentá nuevamente." };
  }
  revalidatePath("/", "layout");
  redirect("/eventos?eliminado=1");
}
