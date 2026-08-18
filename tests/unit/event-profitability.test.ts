import { describe, expect, it } from "vitest";
import { calculateEventProfitability, guestRange } from "@/lib/profitability/event-profitability";

const version=(overrides:Partial<ReturnType<typeof base>>={})=>({...base(),...overrides});
function base(){return{currency:"ARS" as const,grossSubtotal:"5750000",itemDiscountTotal:"0",generalDiscountAmount:"0",taxableBase:"5750000",taxAmount:"0",totalFinal:"5750000"}}
const calc=(input:Partial<Parameters<typeof calculateEventProfitability>[0]>={})=>calculateEventProfitability({version:input.version||version(),assignments:input.assignments||[],expenses:input.expenses||[]});

describe("rentabilidad de evento",()=>{
 it("usa el total vendido sin IVA",()=>expect(calc().netSale.toFixed(2)).toBe("5750000.00"));
 it("usa la base imponible cuando hay IVA",()=>{const p=calc({version:version({taxableBase:"2000000",taxAmount:"420000",totalFinal:"2420000",grossSubtotal:"2000000"})});expect(p.netSale.toFixed(2)).toBe("2000000.00");expect(p.clientTotal.toFixed(2)).toBe("2420000.00")});
 it("excluye el IVA del resultado",()=>expect(calc({version:version({taxableBase:"2000000",taxAmount:"420000",totalFinal:"2420000",grossSubtotal:"2000000"})}).byCurrency.ARS.result.toFixed(2)).toBe("2000000.00"));
 it("suma costo de personal desde agreedAmount",()=>expect(calc({assignments:[{agreedAmount:"200000",currency:"ARS"},{agreedAmount:"150000",currency:"ARS"},{agreedAmount:"120000",currency:"ARS"}]}).byCurrency.ARS.staffCost.toFixed(2)).toBe("470000.00"));
 it("el personal no pagado sigue siendo costo",()=>expect(calc({assignments:[{agreedAmount:"470000",currency:"ARS"}]}).byCurrency.ARS.result.toFixed(2)).toBe("5280000.00"));
 it("los gastos activos reducen resultado",()=>expect(calc({expenses:[{amount:"385000",currency:"ARS",status:"ACTIVE"}]}).byCurrency.ARS.result.toFixed(2)).toBe("5365000.00"));
 it("los gastos VOID no reducen resultado",()=>expect(calc({expenses:[{amount:"385000",currency:"ARS",status:"VOID"}]}).byCurrency.ARS.result.toFixed(2)).toBe("5750000.00"));
 it("calcula el caso Murray con margen HALF_UP",()=>{const p=calc({assignments:[{agreedAmount:"470000",currency:"ARS"}],expenses:[{amount:"385000",currency:"ARS"}]});expect(p.byCurrency.ARS.result.toFixed(2)).toBe("4895000.00");expect(p.byCurrency.ARS.marginPercentage?.toFixed(2)).toBe("85.13")});
 it("mantiene ARS y USD separados",()=>{const p=calc({assignments:[{agreedAmount:"100",currency:"USD"}],expenses:[{amount:"200",currency:"USD"}]});expect(p.byCurrency.ARS.result.toFixed(2)).toBe("5750000.00");expect(p.byCurrency.USD.result.toFixed(2)).toBe("-300.00");expect(p.byCurrency.USD.marginPercentage).toBeNull()});
 it("conserva precio bruto y descuentos del snapshot",()=>{const p=calc({version:version({grossSubtotal:"6000000",itemDiscountTotal:"100000",generalDiscountAmount:"150000",taxableBase:"5750000"})});expect(p.grossSale.toFixed(2)).toBe("6000000.00");expect(p.discounts.toFixed(2)).toBe("250000.00")});
 it("admite un gasto vinculado sin alterar la fórmula",()=>expect(calc({expenses:[{amount:"200000",currency:"ARS"}]}).byCurrency.ARS.directExpenses.toFixed(2)).toBe("200000.00"));
 it("clasifica rangos de invitados",()=>expect([guestRange(50),guestRange(51),guestRange(201)]).toEqual(["1–50","51–100","201+"]));
});
