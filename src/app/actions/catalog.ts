"use server";
import { randomUUID } from "node:crypto";
import { Currency } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { prisma } from "@/server/db/prisma";
import { requireManagement } from "@/server/auth/authorization";
import { audit } from "@/server/audit/audit";

export async function createCatalogItem(kind: "service" | "addOn", formData: FormData) {
  const actor = await requireManagement(); const operationId = randomUUID();
  const data = { name: String(formData.get("name") || "").trim(), category: String(formData.get("category") || "General").trim(), description: String(formData.get("description") || "") || null, listPrice: String(formData.get("listPrice") || "0"), currency: String(formData.get("currency")) as Currency };
  if (!data.name || Number(data.listPrice) < 0 || !Object.values(Currency).includes(data.currency)) throw new Error("Datos de catálogo inválidos");
  await prisma.$transaction(async tx => { const item = kind === "service" ? await tx.service.create({ data }) : await tx.addOn.create({ data }); await audit(tx, { userId: actor.id, action: "CREATE", entity: kind === "service" ? "Service" : "AddOn", entityId: item.id, newValue: data, operationId }); });
  revalidatePath("/catalogo");
}

export async function updateCatalogItem(kind: "service" | "addOn", id: string, formData: FormData) {
  const actor = await requireManagement(); const operationId = randomUUID();
  const data = { name: String(formData.get("name") || "").trim(), category: String(formData.get("category") || "General").trim(), description: String(formData.get("description") || "").trim() || null, listPrice: String(formData.get("listPrice") || "0"), currency: String(formData.get("currency")) as Currency, active: formData.get("active") === "on" };
  if (!data.name || Number(data.listPrice) < 0 || !Object.values(Currency).includes(data.currency)) throw new Error("Datos de catálogo inválidos");
  await prisma.$transaction(async tx => {
    const previous = kind === "service" ? await tx.service.findUniqueOrThrow({ where:{id} }) : await tx.addOn.findUniqueOrThrow({ where:{id} });
    const item = kind === "service" ? await tx.service.update({ where:{id}, data }) : await tx.addOn.update({ where:{id}, data });
    await audit(tx, { userId: actor.id, action: "UPDATE", entity: kind === "service" ? "Service" : "AddOn", entityId: id, previousValue: catalogSnapshot(previous), newValue: catalogSnapshot(item), operationId });
  });
  revalidatePath("/catalogo"); revalidatePath("/presupuestos/nuevo");
}

function catalogSnapshot(item:{name:string;category:string;description:string|null;listPrice:unknown;currency:Currency;active:boolean}) { return { name:item.name,category:item.category,description:item.description,listPrice:String(item.listPrice),currency:item.currency,active:item.active }; }
