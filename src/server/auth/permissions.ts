import { UserRole } from "@prisma/client";
export type Permission = "MANAGE_USERS" | "MANAGE_COMMERCIAL" | "MANAGE_STAFF" | "VIEW_STAFF_OPERATIONS";
export function hasPermission(role: UserRole, permission: Permission) {
  if (permission === "MANAGE_USERS") return role === UserRole.ADMIN;
  if (permission === "MANAGE_COMMERCIAL") return role === UserRole.ADMIN || role === UserRole.ADMIN_FINANCIERO;
  if (permission === "MANAGE_STAFF") return role === UserRole.ADMIN || role === UserRole.ADMIN_FINANCIERO;
  return true;
}
