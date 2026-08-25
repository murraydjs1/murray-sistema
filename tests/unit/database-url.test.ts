import { describe, expect, it } from "vitest";
import { databaseUrlError } from "@/lib/database-url";

describe("databaseUrlError", () => {
  it("acepta URLs PostgreSQL", () => expect(databaseUrlError("postgresql://user:pass@db.example.com:5432/murray")).toBeNull());
  it("rechaza valores que no son URLs", () => expect(databaseUrlError("murray_djs")).toMatch(/PostgreSQL válida/));
  it("rechaza protocolos no soportados", () => expect(databaseUrlError("https://db.example.com")).toMatch(/postgresql/));
});
