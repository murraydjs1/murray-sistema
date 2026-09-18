import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ auth: vi.fn(), transaction: vi.fn(), remove: vi.fn(), revalidate: vi.fn(), redirect: vi.fn() }));
vi.mock("@/server/auth/authorization", () => ({ requireManagement: mocks.auth }));
vi.mock("@/server/db/prisma", () => ({ prisma: { $transaction: mocks.transaction } }));
vi.mock("@/server/events/delete-event", async importOriginal => ({ ...await importOriginal<object>(), deleteEventRecord: mocks.remove }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
import { deleteEvent } from "@/app/actions/delete-event";
import { EventDeletionError } from "@/server/events/delete-event";

const data = () => {
  const form = new FormData();
  form.set("eventId", "5c88f27c-ddcd-4e34-94d6-338168271388");
  form.set("eventNumber", "EVT-2026-0001"); form.set("reason", "Carga duplicada");
  return form;
};
beforeEach(() => {
  vi.resetAllMocks();
  mocks.auth.mockResolvedValue({ id: "management-actor" });
  mocks.transaction.mockImplementation(callback => callback({}));
});
describe("delete event server action", () => {
  it.each(["STAFF", "OPERACIONES"])("rejects a direct call from %s before mutating", async role => {
    mocks.auth.mockRejectedValue(new Error(`Denied ${role}`));
    await expect(deleteEvent({ error: "" }, data())).rejects.toThrow("Denied");
    expect(mocks.transaction).not.toHaveBeenCalled();
  });
  it("requires a reason before starting a transaction", async () => {
    const form = data(); form.set("reason", " ");
    expect((await deleteEvent({ error: "" }, form))?.error).toContain("motivo");
    expect(mocks.transaction).not.toHaveBeenCalled();
  });
  it("uses the authorized actor, serializable isolation and refreshes all affected screens", async () => {
    await deleteEvent({ error: "" }, data());
    expect(mocks.remove).toHaveBeenCalledWith({}, expect.objectContaining({ actorId: "management-actor", reason: "Carga duplicada" }));
    expect(mocks.transaction).toHaveBeenCalledWith(expect.any(Function), { isolationLevel: "Serializable" });
    expect(mocks.revalidate).toHaveBeenCalledWith("/", "layout");
    expect(mocks.redirect).toHaveBeenCalledWith("/eventos?eliminado=1");
  });
  it("shows a domain blocker and keeps the user on the event", async () => {
    mocks.remove.mockRejectedValue(new EventDeletionError("Tiene cobros registrados"));
    expect(await deleteEvent({ error: "" }, data())).toEqual({ error: "Tiene cobros registrados" });
    expect(mocks.redirect).not.toHaveBeenCalled();
  });
  it("does not expose database errors or claim a failed transaction succeeded", async () => {
    mocks.transaction.mockRejectedValue(new Error("private database detail"));
    const result = await deleteEvent({ error: "" }, data());
    expect(result?.error).toContain("No se pudo eliminar");
    expect(result?.error).not.toContain("private");
    expect(mocks.revalidate).not.toHaveBeenCalled();
  });
});
