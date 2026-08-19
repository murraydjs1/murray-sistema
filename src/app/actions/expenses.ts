"use server";

import { randomUUID } from "node:crypto";
import Decimal from "decimal.js";
import { Currency, EventStatus, ExpensePaymentMethod, FinancialStatus, Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { prisma } from "@/server/db/prisma";
import { requireManagement } from "@/server/auth/authorization";
import { audit } from "@/server/audit/audit";
import { createLedgerMovement, voidLedgerMovement } from "@/server/treasury/ledger";

function text(formData: FormData, key: string) { return String(formData.get(key) ?? "").trim(); }
function nullable(formData: FormData, key: string) { return text(formData, key) || null; }
function refresh(eventId?: string) {
  if (eventId) revalidatePath(`/eventos/${eventId}`);
  revalidatePath("/gastos"); revalidatePath("/reportes/rentabilidad"); revalidatePath("/dashboard");
}
function expenseSnapshot(value: { eventId:string; categoryId:string; quoteItemId:string|null; description:string; amount:unknown; currency:Currency; expenseDate:Date; paidByStaffId:string|null; paymentMethod:ExpensePaymentMethod|null; receiptUrl:string|null; notes:string|null; status:string }) {
  return { ...value, amount:String(value.amount), expenseDate:value.expenseDate.toISOString().slice(0,10) };
}
async function assertOpen(tx: Prisma.TransactionClient, eventId:string) {
  const event = await tx.event.findUniqueOrThrow({ where:{id:eventId}, select:{financialStatus:true, sourceQuoteVersionId:true} });
  if (event.financialStatus === FinancialStatus.CLOSED) throw new Error("Reabrí las finanzas del evento antes de modificar costos.");
  return event;
}

export async function createExpense(eventId:string, formData:FormData) {
  const actor=await requireManagement();
  const categoryId=text(formData,"categoryId"), description=text(formData,"description"), currency=text(formData,"currency") as Currency;
  const amount=new Decimal(text(formData,"amount")||0), expenseDate=new Date(`${text(formData,"expenseDate")}T00:00:00.000Z`);
  const paymentRaw=nullable(formData,"paymentMethod"), paymentMethod=paymentRaw as ExpensePaymentMethod|null;
  if(!categoryId||!description||!amount.gt(0)||!Object.values(Currency).includes(currency)||Number.isNaN(expenseDate.getTime())||(paymentMethod&&!Object.values(ExpensePaymentMethod).includes(paymentMethod))) throw new Error("Gasto inválido");
  await prisma.$transaction(async tx=>{
    const event=await assertOpen(tx,eventId);
    await tx.expenseCategory.findFirstOrThrow({where:{id:categoryId,active:true}});
    const paidByStaffId=nullable(formData,"paidByStaffId"), accountId=nullable(formData,"accountId"), quoteItemId=nullable(formData,"quoteItemId"),key=nullable(formData,"idempotencyKey")||randomUUID();
    if(paidByStaffId&&accountId)throw new Error("Elegí cuenta Murray o personal, no ambos");
    if(paidByStaffId) await tx.staff.findFirstOrThrow({where:{id:paidByStaffId,active:true}});
    if(quoteItemId) await tx.quoteItem.findFirstOrThrow({where:{id:quoteItemId,quoteVersionId:event.sourceQuoteVersionId}});
    if(await tx.eventExpense.findUnique({where:{idempotencyKey:key}}))return;
    const expenseId=randomUUID();let treasuryTransactionId:string|null=null;
    if(accountId){const movement=await createLedgerMovement(tx,{accountId,direction:"OUTFLOW",category:"EVENT_EXPENSE",amount,currency,date:expenseDate,description:`Gasto de evento · ${description}`,referenceType:"EventExpense",referenceId:expenseId,createdById:actor.id});treasuryTransactionId=movement.id;}
    const created=await tx.eventExpense.create({data:{id:expenseId,eventId,categoryId,quoteItemId,description,amount:amount.toDecimalPlaces(2).toFixed(2),currency,expenseDate,paidByStaffId,accountId,treasuryTransactionId,idempotencyKey:key,paymentMethod,receiptUrl:nullable(formData,"receiptUrl"),notes:nullable(formData,"notes"),createdById:actor.id}});
    if(paidByStaffId){const reimbursement=await tx.staffReimbursement.create({data:{staffId:paidByStaffId,eventExpenseId:created.id,amount:created.amount,currency,notes:`Reintegro pendiente · ${description}`,idempotencyKey:randomUUID(),createdById:actor.id}});await audit(tx,{userId:actor.id,action:"CREATE",entity:"StaffReimbursement",entityId:reimbursement.id,newValue:{eventExpenseId:created.id,staffId:paidByStaffId,amount:String(created.amount),currency},operationId:key});}
    await audit(tx,{userId:actor.id,action:"CREATE",entity:"EventExpense",entityId:created.id,newValue:{...expenseSnapshot(created),accountId,createsReimbursement:Boolean(paidByStaffId)},operationId:key});
  }); refresh(eventId);
}

export async function updateExpense(id:string, formData:FormData) {
  const actor=await requireManagement(); let eventId="";
  const categoryId=text(formData,"categoryId"), description=text(formData,"description"), currency=text(formData,"currency") as Currency;
  const amount=new Decimal(text(formData,"amount")||0), expenseDate=new Date(`${text(formData,"expenseDate")}T00:00:00.000Z`);
  const paymentRaw=nullable(formData,"paymentMethod"), paymentMethod=paymentRaw as ExpensePaymentMethod|null;
  if(!categoryId||!description||!amount.gt(0)||!Object.values(Currency).includes(currency)||Number.isNaN(expenseDate.getTime())||(paymentMethod&&!Object.values(ExpensePaymentMethod).includes(paymentMethod))) throw new Error("Gasto inválido");
  await prisma.$transaction(async tx=>{
    const old=await tx.eventExpense.findUniqueOrThrow({where:{id},include:{reimbursement:true}}); eventId=old.eventId;
    if(old.status==="VOID") throw new Error("Un gasto anulado no puede editarse.");
    const event=await assertOpen(tx,eventId), paidByStaffId=nullable(formData,"paidByStaffId"), quoteItemId=nullable(formData,"quoteItemId");
    await tx.expenseCategory.findUniqueOrThrow({where:{id:categoryId}});
    if(paidByStaffId) await tx.staff.findFirstOrThrow({where:{id:paidByStaffId,active:true}});
    if(quoteItemId) await tx.quoteItem.findFirstOrThrow({where:{id:quoteItemId,quoteVersionId:event.sourceQuoteVersionId}});
    if(old.treasuryTransactionId&&(old.amount.toString()!==amount.toDecimalPlaces(2).toString()||old.currency!==currency||old.paidByStaffId!==paidByStaffId))throw new Error("Anulá y recreá el gasto para cambiar importe, moneda o pagador con efecto de tesorería.");
    const next=await tx.eventExpense.update({where:{id},data:{categoryId,quoteItemId,description,amount:amount.toDecimalPlaces(2).toFixed(2),currency,expenseDate,paidByStaffId,paymentMethod,receiptUrl:nullable(formData,"receiptUrl"),notes:nullable(formData,"notes")}});
    if(old.reimbursement){if(old.reimbursement.status!=="PENDING"&&(old.amount.toString()!==amount.toDecimalPlaces(2).toString()||old.currency!==currency||old.paidByStaffId!==paidByStaffId))throw new Error("No se puede modificar un gasto cuyo reintegro ya fue procesado");if(paidByStaffId)await tx.staffReimbursement.update({where:{id:old.reimbursement.id},data:{staffId:paidByStaffId,amount:amount.toFixed(2),currency,notes:`Reintegro pendiente · ${description}`}});else await tx.staffReimbursement.update({where:{id:old.reimbursement.id},data:{status:"VOID",voidedAt:new Date(),voidedById:actor.id,voidReason:"El gasto dejó de estar pagado por staff"}});}else if(paidByStaffId){await tx.staffReimbursement.create({data:{staffId:paidByStaffId,eventExpenseId:id,amount:amount.toFixed(2),currency,notes:`Reintegro pendiente · ${description}`,idempotencyKey:randomUUID(),createdById:actor.id}});}
    await audit(tx,{userId:actor.id,action:"UPDATE",entity:"EventExpense",entityId:id,previousValue:expenseSnapshot(old),newValue:expenseSnapshot(next),operationId:randomUUID()});
  }); refresh(eventId);
}

export async function voidExpense(id:string, formData:FormData) {
  const actor=await requireManagement(); const reason=text(formData,"voidReason"); let eventId="";
  if(!reason) throw new Error("Indicá el motivo de anulación.");
  await prisma.$transaction(async tx=>{const old=await tx.eventExpense.findUniqueOrThrow({where:{id},include:{reimbursement:true}}); eventId=old.eventId; await assertOpen(tx,eventId); if(old.status==="VOID")return; const operationId=randomUUID(),next=await tx.eventExpense.update({where:{id},data:{status:"VOID",voidedAt:new Date(),voidedById:actor.id,voidReason:reason}});if(old.treasuryTransactionId)await voidLedgerMovement(tx,old.treasuryTransactionId,actor.id,reason);if(old.reimbursement&&old.reimbursement.status==="PENDING"){await tx.staffReimbursement.update({where:{id:old.reimbursement.id},data:{status:"VOID",voidedAt:new Date(),voidedById:actor.id,voidReason:reason}});await audit(tx,{userId:actor.id,action:"VOID",entity:"StaffReimbursement",entityId:old.reimbursement.id,previousValue:{status:"PENDING"},newValue:{status:"VOID",reason},operationId});}await audit(tx,{userId:actor.id,action:"VOID",entity:"EventExpense",entityId:id,previousValue:expenseSnapshot(old),newValue:expenseSnapshot(next),operationId});}); refresh(eventId);revalidatePath("/tesoreria");
}

export async function closeEventFinances(eventId:string) {
  const actor=await requireManagement();
  await prisma.$transaction(async tx=>{const old=await tx.event.findUniqueOrThrow({where:{id:eventId}}); if(old.financialStatus==="CLOSED")return; if(old.status!==EventStatus.REALIZADO&&old.status!==EventStatus.CERRADO)throw new Error("El evento debe estar REALIZADO o CERRADO antes del cierre financiero."); const next=await tx.event.update({where:{id:eventId},data:{financialStatus:"CLOSED",financialClosedAt:new Date(),financialClosedById:actor.id}}); await audit(tx,{userId:actor.id,action:"CLOSE",entity:"EventFinancial",entityId:eventId,previousValue:{financialStatus:old.financialStatus},newValue:{financialStatus:next.financialStatus,financialClosedAt:next.financialClosedAt},operationId:randomUUID()});}); refresh(eventId);
}
export async function reopenEventFinances(eventId:string) {
  const actor=await requireManagement();
  await prisma.$transaction(async tx=>{const old=await tx.event.findUniqueOrThrow({where:{id:eventId}}); if(old.financialStatus!=="CLOSED")return; const next=await tx.event.update({where:{id:eventId},data:{financialStatus:"OPEN",financialClosedAt:null,financialClosedById:null}}); await audit(tx,{userId:actor.id,action:"REOPEN",entity:"EventFinancial",entityId:eventId,previousValue:{financialStatus:old.financialStatus,financialClosedAt:old.financialClosedAt},newValue:{financialStatus:next.financialStatus},operationId:randomUUID()});}); refresh(eventId);
}

export async function createExpenseCategory(formData:FormData) {const actor=await requireManagement();const name=text(formData,"name"),slug=text(formData,"slug").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");if(!name||!slug)throw new Error("Categoría inválida");await prisma.$transaction(async tx=>{const row=await tx.expenseCategory.create({data:{name,slug,sortOrder:Number(text(formData,"sortOrder")||0)}});await audit(tx,{userId:actor.id,action:"CREATE",entity:"ExpenseCategory",entityId:row.id,newValue:{name,slug,active:true},operationId:randomUUID()});});revalidatePath("/gastos");}
export async function updateExpenseCategory(id:string,formData:FormData){const actor=await requireManagement();const name=text(formData,"name"),active=text(formData,"active")==="true",sortOrder=Number(text(formData,"sortOrder")||0);await prisma.$transaction(async tx=>{const old=await tx.expenseCategory.findUniqueOrThrow({where:{id}});const next=await tx.expenseCategory.update({where:{id},data:{name,active,sortOrder}});await audit(tx,{userId:actor.id,action:active?"UPDATE":"DEACTIVATE",entity:"ExpenseCategory",entityId:id,previousValue:{name:old.name,active:old.active,sortOrder:old.sortOrder},newValue:{name:next.name,active:next.active,sortOrder:next.sortOrder},operationId:randomUUID()});});revalidatePath("/gastos");}
