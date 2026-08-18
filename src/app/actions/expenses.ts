"use server";

import { randomUUID } from "node:crypto";
import Decimal from "decimal.js";
import { Currency, EventStatus, ExpensePaymentMethod, FinancialStatus, Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { prisma } from "@/server/db/prisma";
import { requireManagement } from "@/server/auth/authorization";
import { audit } from "@/server/audit/audit";

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
    const paidByStaffId=nullable(formData,"paidByStaffId"), quoteItemId=nullable(formData,"quoteItemId");
    if(paidByStaffId) await tx.staff.findFirstOrThrow({where:{id:paidByStaffId,active:true}});
    if(quoteItemId) await tx.quoteItem.findFirstOrThrow({where:{id:quoteItemId,quoteVersionId:event.sourceQuoteVersionId}});
    const created=await tx.eventExpense.create({data:{eventId,categoryId,quoteItemId,description,amount:amount.toDecimalPlaces(2).toFixed(2),currency,expenseDate,paidByStaffId,paymentMethod,receiptUrl:nullable(formData,"receiptUrl"),notes:nullable(formData,"notes"),createdById:actor.id}});
    await audit(tx,{userId:actor.id,action:"CREATE",entity:"EventExpense",entityId:created.id,newValue:expenseSnapshot(created),operationId:randomUUID()});
  }); refresh(eventId);
}

export async function updateExpense(id:string, formData:FormData) {
  const actor=await requireManagement(); let eventId="";
  const categoryId=text(formData,"categoryId"), description=text(formData,"description"), currency=text(formData,"currency") as Currency;
  const amount=new Decimal(text(formData,"amount")||0), expenseDate=new Date(`${text(formData,"expenseDate")}T00:00:00.000Z`);
  const paymentRaw=nullable(formData,"paymentMethod"), paymentMethod=paymentRaw as ExpensePaymentMethod|null;
  if(!categoryId||!description||!amount.gt(0)||!Object.values(Currency).includes(currency)||Number.isNaN(expenseDate.getTime())||(paymentMethod&&!Object.values(ExpensePaymentMethod).includes(paymentMethod))) throw new Error("Gasto inválido");
  await prisma.$transaction(async tx=>{
    const old=await tx.eventExpense.findUniqueOrThrow({where:{id}}); eventId=old.eventId;
    if(old.status==="VOID") throw new Error("Un gasto anulado no puede editarse.");
    const event=await assertOpen(tx,eventId), paidByStaffId=nullable(formData,"paidByStaffId"), quoteItemId=nullable(formData,"quoteItemId");
    await tx.expenseCategory.findUniqueOrThrow({where:{id:categoryId}});
    if(paidByStaffId) await tx.staff.findFirstOrThrow({where:{id:paidByStaffId,active:true}});
    if(quoteItemId) await tx.quoteItem.findFirstOrThrow({where:{id:quoteItemId,quoteVersionId:event.sourceQuoteVersionId}});
    const next=await tx.eventExpense.update({where:{id},data:{categoryId,quoteItemId,description,amount:amount.toDecimalPlaces(2).toFixed(2),currency,expenseDate,paidByStaffId,paymentMethod,receiptUrl:nullable(formData,"receiptUrl"),notes:nullable(formData,"notes")}});
    await audit(tx,{userId:actor.id,action:"UPDATE",entity:"EventExpense",entityId:id,previousValue:expenseSnapshot(old),newValue:expenseSnapshot(next),operationId:randomUUID()});
  }); refresh(eventId);
}

export async function voidExpense(id:string, formData:FormData) {
  const actor=await requireManagement(); const reason=text(formData,"voidReason"); let eventId="";
  if(!reason) throw new Error("Indicá el motivo de anulación.");
  await prisma.$transaction(async tx=>{const old=await tx.eventExpense.findUniqueOrThrow({where:{id}}); eventId=old.eventId; await assertOpen(tx,eventId); if(old.status==="VOID")return; const next=await tx.eventExpense.update({where:{id},data:{status:"VOID",voidedAt:new Date(),voidedById:actor.id,voidReason:reason}}); await audit(tx,{userId:actor.id,action:"VOID",entity:"EventExpense",entityId:id,previousValue:expenseSnapshot(old),newValue:expenseSnapshot(next),operationId:randomUUID()});}); refresh(eventId);
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
