import { describe, expect, it } from "vitest";
import { UserRole } from "@prisma/client";
import { hasPermission } from "@/server/auth/permissions";
describe("role permissions", () => {
  it("only ADMIN can manage users", () => {
    expect(hasPermission(UserRole.ADMIN,"MANAGE_USERS")).toBe(true);
    expect(hasPermission(UserRole.ADMIN_FINANCIERO,"MANAGE_USERS")).toBe(false);
    expect(hasPermission(UserRole.STAFF,"MANAGE_USERS")).toBe(false);
  });
  it("ADMIN and ADMIN_FINANCIERO can manage Sprint 1 commercial data", () => {
    expect(hasPermission(UserRole.ADMIN,"MANAGE_COMMERCIAL")).toBe(true);
    expect(hasPermission(UserRole.ADMIN_FINANCIERO,"MANAGE_COMMERCIAL")).toBe(true);
    expect(hasPermission(UserRole.STAFF,"MANAGE_COMMERCIAL")).toBe(false);
  });
  it("only management roles can manage staff finances", () => {
    expect(hasPermission(UserRole.ADMIN,"MANAGE_STAFF")).toBe(true);
    expect(hasPermission(UserRole.ADMIN_FINANCIERO,"MANAGE_STAFF")).toBe(true);
    expect(hasPermission(UserRole.STAFF,"MANAGE_STAFF")).toBe(false);
  });
});
