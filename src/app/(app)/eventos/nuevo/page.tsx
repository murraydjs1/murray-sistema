import { NewEventForm } from "@/components/events/new-event-form";
import { requireManagement } from "@/server/auth/authorization";
import { prisma } from "@/server/db/prisma";

export default async function NewEvent() {
  await requireManagement();
  const clients = await prisma.client.findMany({ where: { active: true }, orderBy: { name: "asc" }, select: { id: true, name: true } });
  const eventTypes = await prisma.eventType.findMany({ where: { active: true }, orderBy: { name: "asc" }, select: { id: true, name: true } });
  const staff = await prisma.staff.findMany({ where: { active: true }, orderBy: { name: "asc" }, select: { id: true, name: true } });
  return <><div className="topbar"><div><div className="eyebrow">Operación</div><h1>Nuevo evento</h1><p className="muted">Cargá los datos principales y continuá con cobros, personal y gastos desde la ficha del evento.</p></div></div><NewEventForm clients={clients} eventTypes={eventTypes} staff={staff} /></>;
}
