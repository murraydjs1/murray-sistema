"use server";
import argon2 from "argon2";
import { redirect } from "next/navigation";
import { prisma } from "@/server/db/prisma";
import { createSession, deleteSession } from "@/server/auth/session";

export type LoginState = { error?: string };
export async function login(_: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user?.active || !(await argon2.verify(user.passwordHash, password))) return { error: "Email o contraseña incorrectos" };
  await createSession(user.id);
  redirect(user.role === "STAFF" ? "/staff" : user.role === "OPERACIONES" ? "/eventos" : "/dashboard");
}
export async function logout() { await deleteSession(); redirect("/login"); }
