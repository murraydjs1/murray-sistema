import Decimal from "decimal.js";

Decimal.set({ precision: 40, rounding: Decimal.ROUND_HALF_UP });

type MoneyValue = string | number | Decimal;
export type LedgerMovement={amount:MoneyValue;direction:"INFLOW"|"OUTFLOW";status?:"ACTIVE"|"VOID";category?:string};
export function accountBalance(movements:LedgerMovement[]){return movements.filter(x=>x.status!=="VOID").reduce((sum,x)=>x.direction==="INFLOW"?sum.plus(x.amount):sum.minus(x.amount),new Decimal(0));}
export function paymentStatus(total:MoneyValue,paid:MoneyValue){const due=new Decimal(total),received=new Decimal(paid);return received.eq(0)?"UNPAID":received.lt(due)?"PARTIAL":received.eq(due)?"PAID":"OVERPAID" as const;}
export function clientAccount(total:MoneyValue,payments:Array<{amount:MoneyValue;status?:string}>){const paid=payments.filter(x=>x.status!=="VOID").reduce((s,x)=>s.plus(x.amount),new Decimal(0)),due=new Decimal(total);return{total:due,paid,pending:due.minus(paid),status:paymentStatus(due,paid)}}
export function reservedTax(total:MoneyValue,taxAmount:MoneyValue,paid:MoneyValue){const gross=new Decimal(total);if(gross.lte(0))return new Decimal(0);return Decimal.min(new Decimal(paid).div(gross),1).mul(taxAmount).toDecimalPlaces(2);}
export function treasuryAvailability(input:{availableCash:MoneyValue;payable:MoneyValue;reimbursements:MoneyValue;reservedTax:MoneyValue;minimumReserve:MoneyValue}){const estimated=new Decimal(input.availableCash).minus(input.payable).minus(input.reimbursements).minus(input.reservedTax);return{estimated,overReserve:estimated.minus(input.minimumReserve)}}
export function assertSameCurrency(from:string,to:string){if(from!==to)throw new Error("No se permiten transferencias entre monedas diferentes");}
