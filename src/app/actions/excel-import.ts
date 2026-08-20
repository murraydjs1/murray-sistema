"use server";

import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { parseExcelImport, type ExcelPreview } from "@/lib/excel-import/parser";
import { audit } from "@/server/audit/audit";
import { requireManagement } from "@/server/auth/authorization";
import { prisma } from "@/server/db/prisma";
import { nextNumber } from "@/server/services/sequence";

export type PreviewState = { preview?: ExcelPreview; error?: string };
async function uploadedFile(data: FormData) { const file=data.get("file"); if(!(file instanceof File)||file.size===0)throw new Error("Seleccioná un archivo .xlsx");if(!file.name.toLowerCase().endsWith(".xlsx"))throw new Error("El archivo debe ser .xlsx");if(file.size>15*1024*1024)throw new Error("El archivo supera el máximo de 15 MB");return{file,buffer:Buffer.from(await file.arrayBuffer())}; }

export async function previewExcelImport(_previous: PreviewState, data: FormData): Promise<PreviewState> {
  await requireManagement();
  try { const {file,buffer}=await uploadedFile(data);const hash=(await parseExcelImport(buffer,file.name)).fileHash,existing=await prisma.excelImportRecord.findMany({where:{fileHash:hash,sheetName:"Hoja1"},select:{rowNumber:true}}),keys=new Set(existing.map((row)=>`${hash}:Hoja1:${row.rowNumber}`));return{preview:await parseExcelImport(buffer,file.name,keys)}; } catch(error) { return{error:error instanceof Error?error.message:"No se pudo leer el archivo"}; }
}

export async function importReadyExcelRows(data: FormData): Promise<void> {
  const actor=await requireManagement(),{file,buffer}=await uploadedFile(data),preview=await parseExcelImport(buffer,file.name),selected=new Set(data.getAll("selectedRow").map(String));
  if(!selected.size)throw new Error("Seleccioná al menos una fila lista");
  for(const rowNumber of selected){const row=preview.rows.find(item=>String(item.rowNumber)===rowNumber);if(!row||row.status==="IGNORED"||row.status==="ALREADY_IMPORTED")throw new Error(`La fila ${rowNumber} no es importable`);if(row.status==="REVIEW"){const correction=String(data.get(`resolvedDate-${row.rowNumber}`)||"");if(!/^\d{4}-\d{2}-\d{2}$/.test(correction))throw new Error(`Resolvé la fecha de la fila ${row.rowNumber}`);row.eventDate=correction;}}
  await prisma.$transaction(async tx=>{const eventType=await tx.eventType.findFirstOrThrow({where:{active:true},orderBy:{name:"asc"}}),staff=await tx.staff.findMany({where:{active:true}});let imported=0,skipped=0;for(const row of preview.rows){if(!selected.has(String(row.rowNumber)))continue;let eventDate=row.eventDate;const correction=String(data.get(`resolvedDate-${row.rowNumber}`)||"");if(!eventDate&&/^\d{4}-\d{2}-\d{2}$/.test(correction))eventDate=correction;if(!eventDate||!row.clientName){skipped++;continue;}const existing=await tx.excelImportRecord.findUnique({where:{fileHash_sheetName_rowNumber:{fileHash:preview.fileHash,sheetName:"Hoja1",rowNumber:row.rowNumber}}});if(existing){skipped++;continue;}let client=await tx.client.findFirst({where:{name:{equals:row.clientName,mode:"insensitive"}}});if(!client)client=await tx.client.create({data:{name:row.clientName,type:"PARTICULAR",source:"OTRO",sourceOther:"Excel Miguel"}});const manager=row.mappedStaffName?staff.find(item=>item.name.toLocaleLowerCase("es")==row.mappedStaffName!.toLocaleLowerCase("es")):null,date=new Date(`${eventDate}T00:00:00.000Z`),number=await nextNumber(tx,"EVENT",date),status=date<new Date(new Date().toISOString().slice(0,10)+"T00:00:00.000Z")?"REALIZADO":"CONFIRMADO";const event=await tx.event.create({data:{number,clientId:client.id,eventTypeId:eventType.id,source:"EXCEL_IMPORT",eventDate:date,startTime:"00:00",endTime:"00:00",venue:row.venue||"A definir",notes:row.notes,managerStaffId:manager?.id,status,financialStatus:"OPEN"}});await tx.eventLegacyFinancialData.create({data:{eventId:event.id,saleArs:row.saleArs,saleUsd:row.saleUsd,depositArs:row.depositArs,depositUsd:row.depositUsd,costArs:row.costArs,costUsd:row.costUsd,resultArs:row.resultArs,resultUsd:row.resultUsd,priceFormula:row.priceFormula,notes:row.notes,sourceSheet:"Hoja1",sourceRow:row.rowNumber}});await tx.excelImportRecord.create({data:{fileHash:preview.fileHash,sheetName:"Hoja1",rowNumber:row.rowNumber,eventId:event.id,importedById:actor.id}});await audit(tx,{userId:actor.id,action:"IMPORT_EXCEL",entity:"Event",entityId:event.id,newValue:{source:"EXCEL_IMPORT",sourceFile:file.name,fileHash:preview.fileHash,sheet:"Hoja1",row:row.rowNumber,client:row.clientName,eventDate},operationId:randomUUID()});imported++;}return{imported,skipped};},{isolationLevel:Prisma.TransactionIsolationLevel.Serializable,timeout:30000});
  revalidatePath("/agenda");revalidatePath("/dashboard");revalidatePath("/configuracion/importar-excel");
}

const textValue=(data:FormData,name:string)=>String(data.get(name)||"").trim();
const nullableMoney=(data:FormData,name:string)=>{const value=textValue(data,name);if(!value)return null;if(!/^-?\d+(?:[.,]\d{1,2})?$/.test(value))throw new Error(`${name}: importe inválido`);return new Prisma.Decimal(value.replace(",","."));};

export async function updateImportedEvent(data:FormData):Promise<void>{
  const actor=await requireManagement(),eventId=textValue(data,"eventId"),eventTypeId=textValue(data,"eventTypeId"),clientName=textValue(data,"clientName"),eventDate=textValue(data,"eventDate"),startTime=textValue(data,"startTime"),endTime=textValue(data,"endTime"),setupTime=textValue(data,"setupTime"),venue=textValue(data,"venue"),managerStaffId=textValue(data,"managerStaffId")||null,status=textValue(data,"status");
  if(!eventId||!clientName||!venue)throw new Error("Cliente, fecha y lugar son obligatorios");
  if(!eventTypeId)throw new Error("Seleccioná un tipo de evento");
  if(!/^\d{4}-\d{2}-\d{2}$/.test(eventDate))throw new Error("Fecha inválida");
  if(!/^\d{2}:\d{2}$/.test(startTime)||!/^\d{2}:\d{2}$/.test(endTime))throw new Error("Horario inválido");
  if(setupTime&&!/^\d{2}:\d{2}$/.test(setupTime))throw new Error("Hora de armado inválida");
  if(!["CONFIRMADO","EN_PREPARACION","LISTO","EN_CURSO","REALIZADO","CERRADO","CANCELADO"].includes(status))throw new Error("Estado inválido");
  await prisma.$transaction(async tx=>{
    const current=await tx.event.findUniqueOrThrow({where:{id:eventId},include:{client:true,legacyFinancialData:true}});
    if(current.source!=="EXCEL_IMPORT")throw new Error("Solo se editan eventos importados desde esta acción");
    await tx.eventType.findFirstOrThrow({where:{id:eventTypeId,active:true}});
    let client=await tx.client.findFirst({where:{name:{equals:clientName,mode:"insensitive"}}});
    if(!client)client=await tx.client.create({data:{name:clientName,type:"PARTICULAR",source:"OTRO",sourceOther:"Excel Miguel"}});
    const event=await tx.event.update({where:{id:eventId},data:{clientId:client.id,eventTypeId,eventDate:new Date(`${eventDate}T00:00:00.000Z`),startTime,endTime,setupTime:setupTime||null,venue,address:textValue(data,"address")||null,locality:textValue(data,"locality")||null,managerStaffId,status:status as never,notes:textValue(data,"notes")||null}});
    const legacyData={saleArs:nullableMoney(data,"saleArs"),saleUsd:nullableMoney(data,"saleUsd"),depositArs:nullableMoney(data,"depositArs"),depositUsd:nullableMoney(data,"depositUsd"),costArs:nullableMoney(data,"costArs"),costUsd:nullableMoney(data,"costUsd"),resultArs:nullableMoney(data,"resultArs"),resultUsd:nullableMoney(data,"resultUsd"),notes:textValue(data,"notes")||null};
    await tx.eventLegacyFinancialData.update({where:{eventId},data:legacyData});
    await audit(tx,{userId:actor.id,action:"UPDATE_EXCEL_IMPORT",entity:"Event",entityId:eventId,previousValue:{client:current.client.name,eventTypeId:current.eventTypeId,eventDate:current.eventDate.toISOString(),venue:current.venue},newValue:{client:client.name,eventTypeId:event.eventTypeId,eventDate:event.eventDate.toISOString(),venue:event.venue},operationId:randomUUID()});
  });
  revalidatePath(`/eventos/${eventId}`);revalidatePath("/agenda");revalidatePath("/dashboard");
}
