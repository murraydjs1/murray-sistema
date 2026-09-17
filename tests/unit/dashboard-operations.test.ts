import { describe, expect, it } from "vitest";
import { previousWeek, collectionBalance, eventStaffBalances } from "@/lib/dashboard/operations";

describe("weekly operations", () => {
  it("uses the previous Monday through Sunday, with Buenos Aires civil dates", () => {
    const week = previousWeek(new Date("2026-09-14T03:00:00Z"));
    expect(week.start.toISOString().slice(0,10)).toBe("2026-09-07");
    expect(week.end.toISOString().slice(0,10)).toBe("2026-09-14");
    // It is still Sunday in Argentina, even though UTC is already Monday.
    expect(previousWeek(new Date("2026-09-14T02:59:59Z")).start.toISOString().slice(0,10)).toBe("2026-08-31");
    expect(previousWeek(new Date("2026-01-01T12:00:00Z")).start.toISOString().slice(0,10)).toBe("2025-12-22");
  });
  it("uses the client total including tax and ignores voided/other-currency payments", () => {
    const balance = collectionBalance({ currency: "ARS", totalFinal: "121.00" }, [
      { currency: "ARS", amount: "20.10", status: "ACTIVE" },
      { currency: "ARS", amount: "0.20", status: "ACTIVE" },
      { currency: "ARS", amount: "40", status: "VOID" },
      { currency: "USD", amount: "100", status: "ACTIVE" },
    ]);
    expect(balance.pending.toFixed(2)).toBe("100.70");
  });
  it("does not offset another person's debt with overpayments and groups multiple roles", () => {
    const result = eventStaffBalances([
      {staffId:"a",currency:"ARS",agreedAmount:"100",active:true,staff:{name:"A"}},
      {staffId:"a",currency:"ARS",agreedAmount:"50",active:true,staff:{name:"A"}},
      {staffId:"b",currency:"ARS",agreedAmount:"70.20",active:true,staff:{name:"B"}},
      {staffId:"b",currency:"USD",agreedAmount:"10",active:true,staff:{name:"B"}},
      {staffId:"c",currency:"ARS",agreedAmount:"100",active:false,staff:{name:"C"}},
    ], [
      {staffId:"a",currency:"ARS",amount:"200",status:"ACTIVE"},
      {staffId:"b",currency:"ARS",amount:"20.10",status:"ACTIVE"},
      {staffId:"b",currency:"ARS",amount:"50",status:"VOID"},
    ]);
    expect(result.map(r => [r.staffId,r.currency,r.pending.toFixed(2)])).toEqual([["a","ARS","0.00"],["b","ARS","50.10"],["b","USD","10.00"]]);
  });
});
