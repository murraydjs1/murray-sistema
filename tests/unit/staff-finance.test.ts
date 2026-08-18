import {describe,expect,it} from "vitest";
import {calculateStaffFinance} from "@/lib/staff/finance";
describe("liquidación de personal",()=>{
  it("separa generado, pagado y pendiente con pagos parciales",()=>{const x=calculateStaffFinance([{amount:150000,eventStatus:"REALIZADO"}],[{amount:50000,status:"ACTIVE",eventId:"e"},{amount:50000,status:"ACTIVE",eventId:"e"}]);expect(x.generated.toFixed()).toBe("150000");expect(x.eventPaid.toFixed()).toBe("100000");expect(x.pending.toFixed()).toBe("50000")});
  it("descuenta adelantos generales",()=>{const x=calculateStaffFinance([{amount:150000,eventStatus:"CERRADO"}],[{amount:40000,status:"ACTIVE",eventId:null}]);expect(x.advances.toFixed()).toBe("40000");expect(x.pending.toFixed()).toBe("110000")});
  it("ignora pagos anulados",()=>{const x=calculateStaffFinance([{amount:100000,eventStatus:"REALIZADO"}],[{amount:100000,status:"VOID",eventId:"e"}]);expect(x.pending.toFixed()).toBe("100000")});
  it("no vuelve exigible un evento futuro",()=>{const x=calculateStaffFinance([{amount:120000,eventStatus:"CONFIRMADO"}],[]);expect(x.generated.toFixed()).toBe("0");expect(x.futureCommitted.toFixed()).toBe("120000")});
  it("mantiene monedas separadas cuando se calcula cada grupo",()=>{const ars=calculateStaffFinance([{amount:100000,eventStatus:"REALIZADO"}],[{amount:20000,status:"ACTIVE",eventId:"e"}]);const usd=calculateStaffFinance([{amount:100,eventStatus:"REALIZADO"}],[{amount:25,status:"ACTIVE",eventId:"e"}]);expect(ars.pending.toFixed()).toBe("80000");expect(usd.pending.toFixed()).toBe("75")});
});
