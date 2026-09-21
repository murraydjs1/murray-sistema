import { describe, expect, it } from "vitest";
import { legacyCollection, legacyCollections } from "@/lib/treasury/legacy-collection";
const legacy = { saleArs: "100.30", depositArs: "20.10", saleUsd: "10", depositUsd: "2" };
describe("imported event collections", () => {
  it("counts the imported deposit once, excludes voids, and separates currencies", () => {
    const payments = [{ amount: "30.10", currency: "ARS" as const, status: "ACTIVE" }, { amount: "999", currency: "ARS" as const, status: "VOID" }, { amount: "3.10", currency: "USD" as const, status: "ACTIVE" }];
    const [ars, usd] = legacyCollections(legacy, payments);
    expect(ars.paid.toFixed(2)).toBe("50.20"); expect(ars.pending?.toFixed(2)).toBe("50.10");
    expect(usd.paid.toFixed(2)).toBe("5.10"); expect(usd.pending?.toFixed(2)).toBe("4.90");
  });
  it("keeps an unknown sale unknown and preserves credits for overpayments", () => {
    expect(legacyCollection({ ...legacy, saleArs: null }, [], "ARS").pending).toBeNull();
    expect(legacyCollection(legacy, [{ amount: "90.30", currency: "ARS", status: "ACTIVE" }], "ARS").pending?.toFixed(2)).toBe("-10.10");
    expect(legacyCollection(legacy, [{ amount: "80.20", currency: "ARS", status: "ACTIVE" }], "ARS").pending?.isZero()).toBe(true);
  });
});
