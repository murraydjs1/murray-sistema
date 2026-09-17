import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ auth: vi.fn(), client: vi.fn(), staff: vi.fn() }));
vi.mock("@/server/auth/authorization", () => ({ requireManagement: mocks.auth }));
vi.mock("@/app/actions/treasury", () => ({ createClientPayment: mocks.client }));
vi.mock("@/app/actions/staff-payments", () => ({ createStaffPayment: mocks.staff }));
import { recordDashboardPayment } from "@/app/actions/dashboard-payments";
const state = { message: "", success: false, operationId: "5c88f27c-ddcd-4e34-94d6-338168271388" };
beforeEach(() => vi.resetAllMocks());
describe("dashboard payment actions", () => {
  it("rejects unauthorized direct calls before performing any mutation", async () => {
    mocks.auth.mockRejectedValue(new Error("Access denied"));
    await expect(recordDashboardPayment(state, new FormData())).rejects.toThrow("Access denied");
    expect(mocks.client).not.toHaveBeenCalled(); expect(mocks.staff).not.toHaveBeenCalled();
  });
  it("reuses the existing audited client payment flow and renews the operation ID", async () => {
    const data = new FormData();
    const result = await recordDashboardPayment(state, data);
    expect(mocks.client).toHaveBeenCalledWith(data);
    expect(data.get("idempotencyKey")).toBe(state.operationId);
    expect(result.success).toBe(true); expect(result.operationId).not.toBe(state.operationId);
  });
  it("retains the operation ID after a failure so retries cannot duplicate a committed payment", async () => {
    const data = new FormData(); data.set("staffId", "person");
    mocks.staff.mockRejectedValue(new Error("Database unreachable"));
    const result = await recordDashboardPayment(state, data);
    expect(result.success).toBe(false); expect(result.operationId).toBe(state.operationId);
    expect(mocks.staff).toHaveBeenCalledWith("person", data);
  });
});
