import { describe, expect, it } from "vitest";

import { accountBalance, assertSameCurrency, clientAccount, reservedTax, treasuryAvailability } from "@/lib/treasury/calculations";

describe("tesorería", () => {
  it("deriva el saldo de entradas y salidas activas", () => expect(accountBalance([{ amount: "1000", direction: "INFLOW" }, { amount: "250", direction: "OUTFLOW" }]).toFixed(2)).toBe("750.00"));
  it("ignora movimientos anulados", () => expect(accountBalance([{ amount: "1000", direction: "INFLOW", status: "VOID" }]).toFixed(2)).toBe("0.00"));
  it("registra un cobro en la cuenta corriente", () => expect(clientAccount("1000", [{ amount: "200" }]).paid.toFixed(2)).toBe("200.00"));
  it("calcula un pago parcial", () => expect(clientAccount("1000", [{ amount: "200" }]).status).toBe("PARTIAL"));
  it("calcula un pago total", () => expect(clientAccount("1000", [{ amount: "1000" }]).status).toBe("PAID"));
  it("detecta sobrepago", () => expect(clientAccount("1000", [{ amount: "1001" }]).status).toBe("OVERPAID"));
  it("el void de cobro deja de contar", () => expect(clientAccount("1000", [{ amount: "500", status: "VOID" }]).pending.toFixed(2)).toBe("1000.00"));
  it("un pago de staff reduce caja una vez", () => expect(accountBalance([{ amount: "1000", direction: "INFLOW" }, { amount: "150", direction: "OUTFLOW", category: "STAFF_PAYMENT" }]).toFixed(2)).toBe("850.00"));
  it("un gasto Murray reduce caja", () => expect(accountBalance([{ amount: "1000", direction: "INFLOW" }, { amount: "40", direction: "OUTFLOW", category: "EVENT_EXPENSE" }]).toFixed(2)).toBe("960.00"));
  it("un gasto de staff no mueve caja Murray", () => expect(accountBalance([{ amount: "1000", direction: "INFLOW" }]).toFixed(2)).toBe("1000.00"));
  it("el reintegro mueve caja sin crear otro gasto económico", () => expect(accountBalance([{ amount: "1000", direction: "INFLOW" }, { amount: "40", direction: "OUTFLOW", category: "REIMBURSEMENT" }]).toFixed(2)).toBe("960.00"));
  it("una transferencia conserva el saldo global", () => { const a = accountBalance([{ amount: "500", direction: "OUTFLOW" }]); const b = accountBalance([{ amount: "500", direction: "INFLOW" }]); expect(a.plus(b).toFixed(2)).toBe("0.00"); });
  it("un retiro reduce caja", () => expect(accountBalance([{ amount: "200", direction: "OUTFLOW", category: "OWNER_WITHDRAWAL" }]).toFixed(2)).toBe("-200.00"));
  it("un aporte aumenta caja", () => expect(accountBalance([{ amount: "500", direction: "INFLOW", category: "OWNER_CONTRIBUTION" }]).toFixed(2)).toBe("500.00"));
  it("reserva IVA proporcional cobrado", () => expect(reservedTax("2420000", "420000", "1210000").toFixed(2)).toBe("210000.00"));
  it("reserva como máximo el IVA total", () => expect(reservedTax("2420000", "420000", "3000000").toFixed(2)).toBe("420000.00"));
  it("calcula disponibilidad estimada sin doble contar", () => expect(treasuryAvailability({ availableCash: "8000", payable: "1500", reimbursements: "500", reservedTax: "1000", minimumReserve: "0" }).estimated.toFixed(2)).toBe("5000.00"));
  it("calcula excedente sobre reserva", () => expect(treasuryAvailability({ availableCash: "8000", payable: "1500", reimbursements: "500", reservedTax: "1000", minimumReserve: "2000" }).overReserve.toFixed(2)).toBe("3000.00"));
  it("mantiene ARS y USD como cálculos separados", () => { const ars = accountBalance([{ amount: "100", direction: "INFLOW" }]); const usd = accountBalance([{ amount: "2", direction: "INFLOW" }]); expect([ars.toFixed(2), usd.toFixed(2)]).toEqual(["100.00", "2.00"]); });
  it("rechaza transferencias entre monedas", () => expect(() => assertSameCurrency("ARS", "USD")).toThrow(/monedas diferentes/));
  it("acepta transferencias de igual moneda", () => expect(() => assertSameCurrency("ARS", "ARS")).not.toThrow());
  it("la misma clave idempotente representa una única operación", () => { const keys = new Set(["operation-1", "operation-1"]); expect(keys.size).toBe(1); });
});
