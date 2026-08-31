import { UserRole } from "@prisma/client";
export type Permission = "MANAGE_USERS" | "MANAGE_COMMERCIAL" | "MANAGE_STAFF" | "VIEW_STAFF_OPERATIONS" | "MANAGE_OPERATIONS";
export function hasPermission(role: UserRole, permission: Permission) {
  if (permission === "MANAGE_USERS") return role === UserRole.ADMIN;
  if (permission === "MANAGE_COMMERCIAL" || permission === "MANAGE_OPERATIONS") return role === UserRole.ADMIN || role === UserRole.ADMIN_FINANCIERO || role === UserRole.OPERACIONES;
  if (permission === "MANAGE_STAFF") return role === UserRole.ADMIN || role === UserRole.ADMIN_FINANCIERO;
  return true;
}
