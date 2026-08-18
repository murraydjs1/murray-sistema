"use server";
import { randomUUID } from "node:crypto";
import { ClientSource, ClientType } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/server/db/prisma";
import { requireManagement } from "@/server/auth/authorization";
import { audit } from "@/server/audit/audit";

export async function createClient(formData: FormData) {
  const actor = await requireManagement();
  const name = String(formData.get("name") || "").trim();
  const type = String(formData.get("type")) as ClientType;
  if (!name || !Object.values(ClientType).includes(type)) throw new Error("Cliente inválido");
  const client = await prisma.$transaction(async tx => {
    const created = await tx.client.create({ data: { name, type, phone: str(formData, "phone"), email: str(formData, "email"), locality: str(formData, "locality"), address: str(formData, "address"), googleMapsUrl: str(formData, "googleMapsUrl"), source: (str(formData, "source") as ClientSource) || null, notes: str(formData, "notes") } });
    const contactName = str(formData, "contactName");
    if (contactName) await tx.clientContact.create({ data: { clientId: created.id, name: contactName, phone: str(formData, "contactPhone"), email: str(formData, "contactEmail"), isPrimary: true } });
    await audit(tx, { userId: actor.id, action: "CREATE", entity: "Client", entityId: created.id, newValue: { name, type }, operationId: randomUUID() });
    return created;
  });
  revalidatePath("/clientes");
  revalidatePath("/presupuestos/nuevo");
  redirect(`/clientes/${client.id}`);
}

export async function addContact(clientId: string, formData: FormData) {
  const actor = await requireManagement();
  const client = await prisma.client.findUniqueOrThrow({ where: { id: clientId }, include: { contacts: true } });
  if (client.type === "PARTICULAR" && client.contacts.length) throw new Error("Un cliente particular puede tener un solo contacto");
  const name = String(formData.get("name") || "").trim(); if (!name) throw new Error("Ingresá el nombre");
  const requestedPrimary = formData.get("isPrimary") === "on" || client.contacts.length === 0;
  await prisma.$transaction(async tx => {
    if (requestedPrimary) await tx.clientContact.updateMany({ where: { clientId }, data: { isPrimary: false } });
    const contact = await tx.clientContact.create({ data: { clientId, name, phone: str(formData, "phone"), email: str(formData, "email"), position: str(formData, "position"), isPrimary: requestedPrimary } });
    await audit(tx, { userId: actor.id, action: "CREATE", entity: "ClientContact", entityId: contact.id, newValue: { clientId, name, isPrimary: requestedPrimary }, operationId: randomUUID() });
  });
  revalidatePath(`/clientes/${clientId}`);
}
export async function updateClient(clientId: string, formData: FormData) {
  const actor=await requireManagement();
  await prisma.$transaction(async tx=>{const previous=await tx.client.findUniqueOrThrow({where:{id:clientId}});const next=await tx.client.update({where:{id:clientId},data:{name:String(formData.get("name")||"").trim(),phone:str(formData,"phone"),email:str(formData,"email"),locality:str(formData,"locality"),address:str(formData,"address"),notes:str(formData,"notes")}});await audit(tx,{userId:actor.id,action:"UPDATE",entity:"Client",entityId:clientId,previousValue:{name:previous.name,phone:previous.phone,email:previous.email,locality:previous.locality,address:previous.address,notes:previous.notes},newValue:{name:next.name,phone:next.phone,email:next.email,locality:next.locality,address:next.address,notes:next.notes},operationId:randomUUID()});});
  revalidatePath(`/clientes/${clientId}`);
}
function str(data: FormData, key: string) { const value = String(data.get(key) || "").trim(); return value || null; }
