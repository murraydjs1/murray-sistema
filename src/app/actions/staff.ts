"use server";
import { randomUUID } from "node:crypto";
import { Currency, StaffRole } from "@prisma/client";
import Decimal from "decimal.js";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/server/db/prisma";
import { requireManagement } from "@/server/auth/authorization";
import { audit } from "@/server/audit/audit";

function data(formData:FormData){const defaultRole=String(formData.get("defaultRole")) as StaffRole,currency=String(formData.get("currency")) as Currency,name=String(formData.get("name")||"").trim(),rate=new Decimal(String(formData.get("defaultEventRate")||0));if(!name||!Object.values(StaffRole).includes(defaultRole)||!Object.values(Currency).includes(currency)||rate.isNegative())throw new Error("Datos de personal inválidos");return{name,phone:nullable(formData,"phone"),email:nullable(formData,"email"),defaultRole,defaultEventRate:rate.toFixed(2),currency,userId:nullable(formData,"userId"),notes:nullable(formData,"notes")};}
export async function createStaff(formData:FormData){const actor=await requireManagement(),input=data(formData);const created=await prisma.$transaction(async tx=>{const staff=await tx.staff.create({data:input});await audit(tx,{userId:actor.id,action:"CREATE",entity:"Staff",entityId:staff.id,newValue:{...input,defaultEventRate:String(input.defaultEventRate)},operationId:randomUUID()});return staff});revalidatePath("/personal");redirect(`/personal/${created.id}`);}
export async function updateStaff(id:string,formData:FormData){const actor=await requireManagement(),input=data(formData);await prisma.$transaction(async tx=>{const old=await tx.staff.findUniqueOrThrow({where:{id}});const next=await tx.staff.update({where:{id},data:input});await audit(tx,{userId:actor.id,action:"UPDATE",entity:"Staff",entityId:id,previousValue:snapshot(old),newValue:snapshot(next),operationId:randomUUID()});});revalidatePath(`/personal/${id}`);revalidatePath("/personal");}
export async function deactivateStaff(id:string){const actor=await requireManagement();await prisma.$transaction(async tx=>{const old=await tx.staff.findUniqueOrThrow({where:{id}});if(!old.active)return;await tx.staff.update({where:{id},data:{active:false}});await audit(tx,{userId:actor.id,action:"DEACTIVATE",entity:"Staff",entityId:id,previousValue:{active:true},newValue:{active:false},operationId:randomUUID()});});revalidatePath(`/personal/${id}`);revalidatePath("/personal");}
function nullable(formData:FormData,key:string){const value=String(formData.get(key)||"").trim();return value||null;}
function snapshot(s:{name:string;phone:string|null;email:string|null;defaultRole:StaffRole;defaultEventRate:unknown;currency:Currency;active:boolean;userId:string|null;notes:string|null}){return{name:s.name,phone:s.phone,email:s.email,defaultRole:s.defaultRole,defaultEventRate:String(s.defaultEventRate),currency:s.currency,active:s.active,userId:s.userId,notes:s.notes};}
