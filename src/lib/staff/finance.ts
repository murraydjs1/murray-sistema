import Decimal from "decimal.js";

export type FinanceAssignment={amount:string|number;eventStatus:string;eventId?:string};
export type FinancePayment={amount:string|number;status:string;eventId?:string|null};
export function calculateStaffFinance(assignments:FinanceAssignment[],payments:FinancePayment[]){
  const dueStatuses=new Set(["REALIZADO","CERRADO"]); const futureStatuses=new Set(["CONFIRMADO","EN_PREPARACION","LISTO","EN_CURSO"]);
  const dueAssignments=assignments.filter(a=>dueStatuses.has(a.eventStatus));const generated=dueAssignments.reduce((s,a)=>s.plus(a.amount),new Decimal(0));
  const futureCommitted=assignments.filter(a=>futureStatuses.has(a.eventStatus)).reduce((s,a)=>s.plus(a.amount),new Decimal(0));
  const active=payments.filter(p=>p.status==="ACTIVE");
  const hasEventIds=assignments.some(a=>a.eventId),dueEventIds=new Set(dueAssignments.map(a=>a.eventId).filter(Boolean));
  const eventPaid=active.filter(p=>p.eventId&&(!hasEventIds||dueEventIds.has(p.eventId))).reduce((s,p)=>s.plus(p.amount),new Decimal(0));
  const advances=active.filter(p=>!p.eventId).reduce((s,p)=>s.plus(p.amount),new Decimal(0));
  return {generated,eventPaid,advances,futureCommitted,pending:generated.minus(eventPaid).minus(advances)};
}
