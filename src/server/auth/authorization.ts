import "server-only";
import { UserRole } from "@prisma/client";
import { redirect } from "next/navigation";
import { getCurrentUser } from "./session";

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}
export async function requireRole(roles: UserRole[]) {
  const user = await requireUser();
  if (!roles.includes(user.role)) redirect("/sin-acceso");
  return user;
}
export const requireManagement = () => requireRole([UserRole.ADMIN, UserRole.ADMIN_FINANCIERO]);
export const requireOperations = () => requireRole([UserRole.ADMIN, UserRole.ADMIN_FINANCIERO, UserRole.OPERACIONES]);
export const requireAdmin = () => requireRole([UserRole.ADMIN]);
