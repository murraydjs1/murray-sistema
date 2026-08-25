import { PrismaClient, Currency, StaffRole, UserRole } from "@prisma/client";
import argon2 from "argon2";
import { premium200AddOns, premium200Service } from "../src/lib/catalog/premium-200";
const db = new PrismaClient();

async function main() {
  const expenseCategories = [
    ["Combustible", "combustible"], ["Comida post fiesta", "comida-post-fiesta"], ["Peajes", "peajes"],
    ["Alquiler de equipos", "alquiler-de-equipos"], ["CO2", "co2"], ["Papelitos", "papelitos"],
    ["Cinta aisladora", "cinta-aisladora"], ["Precintos", "precintos"], ["Otros", "otros"],
  ] as const;
  for (const [index, [name, slug]] of expenseCategories.entries()) {
    await db.expenseCategory.upsert({ where: { slug }, update: { name, active: true, sortOrder: index,scope:slug==="otros"?"BOTH":"EVENT" }, create: { name, slug, sortOrder: index,scope:slug==="otros"?"BOTH":"EVENT" } });
  }
  for (const [index,[name,slug]] of [["Software","software"],["Contador","contador"],["Administración","administracion"]].entries()) await db.expenseCategory.upsert({where:{slug},update:{name,active:true,scope:"GENERAL",sortOrder:100+index},create:{name,slug,scope:"GENERAL",sortOrder:100+index}});
  for (const name of ["Cumpleaños 40", "Cumpleaños 50", "Cumpleaños 60", "Cumpleaños", "Casamiento", "Corporativo", "Otro"]) {
    await db.eventType.upsert({ where: { name }, update: {}, create: { name } });
  }
  await db.taxRate.upsert({ where: { id: "00000000-0000-0000-0000-000000000021" }, update: {}, create: { id: "00000000-0000-0000-0000-000000000021", name: "IVA 21%", rate: 21 } });
  const services = [
    ["Producción técnica", "Técnica", 2000000], ["Servicio DJ Murray DJs", "DJ", 1200000],
    ["DJ Micky 2 horas", "DJ", 2000000], ["DJ Micky 4 horas", "DJ", 3000000],
  ] as const;
  for (const [name, category, listPrice] of services) { const existing=await db.service.findFirst({where:{name}}); if(existing) await db.service.update({where:{id:existing.id},data:{category,listPrice,currency:Currency.ARS,active:true}}); else await db.service.create({ data: { name, category, listPrice, currency: Currency.ARS } }); }
  const addOns = [
    ["Cabina DJ pantalla LED", "Producción", 2500000, null], ["10 protones adicionales", "Producción", 250000, null], ["Bola espejada", "Producción", 150000, null], ["CO2 2 tubos", "Producción", 1250000, null], ["CO2 4 tubos", "Producción", 1750000, null], ["Papelitos", "Producción", 650000, null], ["Grupo electrógeno", "Producción", 250000, null],
  ] as const;
  for (const [name, category, listPrice, description] of addOns) {
    const existing=await db.addOn.findFirst({where:{name}}); if(existing) await db.addOn.update({where:{id:existing.id},data:{category,description,listPrice,currency:Currency.ARS,active:true}}); else await db.addOn.create({ data: { name, category, description, listPrice, currency: Currency.ARS } });
  }
  const premiumService = await db.service.findFirst({ where: { OR: [{ code: premium200Service.code }, { name: premium200Service.name }] } });
  if (premiumService) await db.service.update({ where: { id: premiumService.id }, data: { ...premium200Service, active: true } }); else await db.service.create({ data: { ...premium200Service, active: true } });
  for (const addOn of premium200AddOns) {
    const existing = await db.addOn.findFirst({ where: { OR: [{ code: addOn.code }, { name: addOn.name }] } });
    if (existing) await db.addOn.update({ where: { id: existing.id }, data: { ...addOn, active: true } }); else await db.addOn.create({ data: { ...addOn, active: true } });
  }
  if (process.env.SEED_DEMO_USERS === "true") {
    const demoPassword = process.env.SEED_DEMO_PASSWORD;
    if (!demoPassword) throw new Error("SEED_DEMO_PASSWORD es obligatorio cuando SEED_DEMO_USERS=true");
    const passwordHash = await argon2.hash(demoPassword, { type: argon2.argon2id });
    for (const [name,email,role] of [["Miguel","miguel@murraydjs.local",UserRole.ADMIN],["Maicky","maicky@murraydjs.local",UserRole.ADMIN_FINANCIERO],["Paddy","paddy@murraydjs.local",UserRole.STAFF],["Luis","luis@murraydjs.local",UserRole.STAFF],["Gonzalo","gonzalo@murraydjs.local",UserRole.STAFF],["Bautista","bautista@murraydjs.local",UserRole.STAFF]] as const) {
      await db.user.upsert({ where: { email }, update: {name,role,passwordHash,active:true}, create: { name,email,passwordHash,role } });
    }
  }
  for (const [name,defaultRole,email] of [["Miguel",StaffRole.DJ,"miguel@murraydjs.local"],["Maicky",StaffRole.DJ_TECNICO,"maicky@murraydjs.local"],["Paddy",StaffRole.DJ,"paddy@murraydjs.local"],["Luis",StaffRole.DJ_TECNICO,"luis@murraydjs.local"],["Gonzalo",StaffRole.TECNICO,"gonzalo@murraydjs.local"],["Bautista",StaffRole.TECNICO,"bautista@murraydjs.local"],["Tincho",StaffRole.DJ_TECNICO,null]] as const) {
    const user=email?await db.user.findUnique({where:{email},select:{id:true}}):null;
    const existing=user?await db.staff.findUnique({where:{userId:user.id}}):await db.staff.findFirst({where:{name}});
    if(existing)await db.staff.update({where:{id:existing.id},data:{name,defaultRole,userId:user?.id||null,active:true}});
    else await db.staff.create({data:{name,defaultRole,defaultEventRate:0,currency:Currency.ARS,userId:user?.id||null}});
  }
  for(const account of [{name:"Mercado Pago Miguel",type:"MERCADO_PAGO" as const,includeInAvailableCash:true},{name:"Banco Galicia Miguel",type:"BANK" as const,includeInAvailableCash:true},{name:"Efectivo Murray DJs",type:"CASH" as const,includeInAvailableCash:true},{name:"Party Express — Fondos por rendir",type:"THIRD_PARTY" as const,includeInAvailableCash:false}])await db.financialAccount.upsert({where:{name_currency:{name:account.name,currency:Currency.ARS}},update:{...account,active:true},create:{...account,currency:Currency.ARS}});
  const admin=await db.user.findFirst({where:{role:UserRole.ADMIN},orderBy:{createdAt:"asc"}});if(admin)for(const currency of [Currency.ARS,Currency.USD])await db.financialSetting.upsert({where:{currency},update:{updatedById:admin.id},create:{currency,minimumCashReserve:0,updatedById:admin.id}});
}
main().finally(() => db.$disconnect());
