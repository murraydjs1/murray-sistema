import { randomUUID } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ auth: vi.fn(), tx: vi.fn(), record: vi.fn(), refresh: vi.fn() }));
vi.mock("@/server/auth/authorization", () => ({ requireManagement: mocks.auth }));
vi.mock("@/server/db/prisma", () => ({ prisma: { $transaction: mocks.tx } }));
vi.mock("@/server/treasury/client-payments", () => ({ recordClientPayment: mocks.record }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.refresh }));
import { createClientPayment } from "@/app/actions/treasury";
const form = () => { const d = new FormData(); Object.entries({ eventId: randomUUID(), currency: "ARS", amount: "10.20", paymentDate: "2026-09-21", paymentMethod: "TRANSFER", paymentType: "PARTIAL", idempotencyKey: randomUUID() }).forEach(([k, v]) => d.set(k, v)); return d; };
beforeEach(() => { vi.resetAllMocks(); mocks.auth.mockResolvedValue({ id: "actor" }); mocks.tx.mockImplementation(fn => fn("transaction")); });
describe("client receipt action", () => {
  it("requires management even for a direct backend call", async () => {
    mocks.auth.mockRejectedValue(new Error("Access denied"));
    await expect(createClientPayment(form())).rejects.toThrow("Access denied");
    expect(mocks.tx).not.toHaveBeenCalled();
  });
  it.each([["amount", "-1"], ["amount", "NaN"], ["amount", "0.001"], ["paymentDate", "2026-02-30"], ["currency", "EUR"]])("rejects invalid %s: %s", async (key, value) => {
    const data = form(); data.set(key, value);
    await expect(createClientPayment(data)).rejects.toThrow(); expect(mocks.tx).not.toHaveBeenCalled();
  });
  it("persists atomically and refreshes event and dashboard balances", async () => {
    await createClientPayment(form());
    expect(mocks.record).toHaveBeenCalledWith("transaction", expect.objectContaining({ currency: "ARS", notes: null }), "actor");
    expect(mocks.tx).toHaveBeenCalledWith(expect.any(Function), { isolationLevel: "Serializable" });
    expect(mocks.refresh).toHaveBeenCalledWith("/eventos", "layout");
  });
});
