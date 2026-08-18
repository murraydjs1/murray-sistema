import { describe, expect, it } from "vitest";
import { calculateQuote } from "@/lib/money/quote-calculator";

describe("quote calculator", () => {
  it("applies item discount, then general discount, IVA and deposit", () => {
    const result = calculateQuote({
      items: [
        { description: "Servicio", quantity: 1, listUnitPrice: 2_000_000, discount: { type: "PERCENTAGE", value: 10 } },
        { description: "Adicional", quantity: 2, listUnitPrice: 500_000, discount: { type: "FIXED", value: 100_000 } },
      ],
      generalDiscount: { type: "FIXED", value: 200_000 }, taxRate: 21, depositPercentage: 50,
    });
    expect(result.grossSubtotal.toFixed(2)).toBe("3000000.00");
    expect(result.itemDiscountTotal.toFixed(2)).toBe("300000.00");
    expect(result.taxableBase.toFixed(2)).toBe("2500000.00");
    expect(result.taxAmount.toFixed(2)).toBe("525000.00");
    expect(result.totalFinal.toFixed(2)).toBe("3025000.00");
    expect(result.depositAmount.toFixed(2)).toBe("1512500.00");
    expect(result.balance.toFixed(2)).toBe("1512500.00");
  });
  it("rounds HALF_UP on the version tax total", () => {
    const result = calculateQuote({ items: [{ description: "x", quantity: 1, listUnitPrice: "0.50", discount: { type: "NONE", value: 0 } }], generalDiscount: { type: "NONE", value: 0 }, taxRate: 1, depositPercentage: 50 });
    expect(result.taxAmount.toFixed(2)).toBe("0.01");
    expect(result.depositAmount.toFixed(2)).toBe("0.26");
  });
  it("rejects discounts above available amount", () => {
    expect(() => calculateQuote({ items: [{ description: "x", quantity: 1, listUnitPrice: 100, discount: { type: "FIXED", value: 101 } }], generalDiscount: { type: "NONE", value: 0 }, taxRate: 0, depositPercentage: 50 })).toThrow(/superar/);
  });
  it("rejects mixed-invalid and negative inputs", () => {
    expect(() => calculateQuote({ items: [{ description: "x", quantity: -1, listUnitPrice: 100, discount: { type: "NONE", value: 0 } }], generalDiscount: { type: "NONE", value: 0 }, taxRate: 0, depositPercentage: 50 })).toThrow(/cantidad/);
  });
});
