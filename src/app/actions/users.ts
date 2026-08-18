"use server";
import { randomUUID } from "node:crypto";
import argon2 from "argon2";
import { UserRole } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { prisma } from "@/server/db/prisma";
import { requireAdmin } from "@/server/auth/authorization";
import { audit } from "@/server/audit/audit";

export async function saveUser(formData: FormData) {
  const actor = await requireAdmin();
  const id = String(formData.get("id") || "");
  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  const role = String(formData.get("role")) as UserRole;
  if (!name || !email || !Object.values(UserRole).includes(role)) throw new Error("Datos de usuario inválidos");
  if (!id && password.length < 12) throw new Error("La contraseña debe tener al menos 12 caracteres");
  await prisma.$transaction(async (tx) => {
    const previous = id ? await tx.user.findUniqueOrThrow({ where: { id } }) : null;
    const user = id ? await tx.user.update({ where: { id }, data: { name, email, role, ...(password ? { passwordHash: await argon2.hash(password, { type: argon2.argon2id }) } : {}) } }) : await tx.user.create({ data: { name, email, role, passwordHash: await argon2.hash(password, { type: argon2.argon2id }) } });
    await audit(tx, { userId: actor.id, action: id ? "UPDATE" : "CREATE", entity: "User", entityId: user.id, previousValue: previous ? { name: previous.name, email: previous.email, role: previous.role, active: previous.active } : undefined, newValue: { name, email, role, active: user.active }, operationId: randomUUID() });
  });
  revalidatePath("/usuarios");
}

export async function toggleUser(id: string) {
  const actor = await requireAdmin();
  if (id === actor.id) throw new Error("No podés desactivar tu propio usuario");
  await prisma.$transaction(async tx => { const old = await tx.user.findUniqueOrThrow({ where: { id } }); const next = await tx.user.update({ where: { id }, data: { active: !old.active } }); await audit(tx, { userId: actor.id, action: next.active ? "ACTIVATE" : "DEACTIVATE", entity: "User", entityId: id, previousValue: { active: old.active }, newValue: { active: next.active }, operationId: randomUUID() }); });
  revalidatePath("/usuarios");
}
