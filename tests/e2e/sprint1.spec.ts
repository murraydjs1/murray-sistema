import { expect, test } from "@playwright/test";
import { PrismaClient } from "@prisma/client";

const db=new PrismaClient();
const password=process.env.SEED_DEMO_PASSWORD!;
async function login(page:import("@playwright/test").Page,email:string){await page.goto("/login");await page.getByLabel("Email").fill(email);await page.getByLabel("Contraseña").fill(password);await page.getByRole("button",{name:"Ingresar"}).click();await page.waitForURL(email.startsWith("paddy")?"**/staff":"**/dashboard");}
async function logout(page:import("@playwright/test").Page){await page.locator("form").filter({has:page.getByRole("button",{name:"Salir"})}).getByRole("button",{name:"Salir"}).click();await page.waitForURL("**/login");}
async function addCatalogItem(page:import("@playwright/test").Page,type:"Servicio"|"Adicional",name:string){await page.getByRole("heading",{name:"Armar presupuesto"}).waitFor();await page.waitForTimeout(300);await page.getByRole("button",{name:type,exact:true}).click();const card=page.locator(".item-card").last();await card.waitFor({state:"visible"});await card.locator("select").first().selectOption({label:name});}

test.afterAll(async()=>db.$disconnect());
test("Sprint 1 completo con PostgreSQL real",async({page})=>{
  await login(page,"miguel@murraydjs.local");
  await expect(page).toHaveURL(/dashboard/);
  await expect(page.getByRole("heading",{name:"Resumen del período"})).toBeVisible();

  await page.goto("/clientes/nuevo");
  await page.getByLabel("Nombre / razón social *").fill("Cliente Prueba Murray");
  await page.getByLabel("Tipo").selectOption("PARTICULAR");
  await page.getByLabel("Teléfono").first().fill("11 5555 0101");
  await page.getByLabel("Nombre del contacto").fill("Contacto Prueba");
  await page.getByLabel("Teléfono").nth(1).fill("11 5555 0102");
  await page.getByRole("button",{name:"Guardar cliente"}).click();
  await expect(page).toHaveURL(/clientes\/[0-9a-f-]+$/);
  const clientUrl=page.url();
  await page.getByText("Datos del cliente").click();
  await page.getByLabel("Observaciones").fill("Caso validado por E2E Sprint 1");
  await page.getByRole("button",{name:"Guardar cambios"}).click();

  await page.goto("/presupuestos/nuevo");
  await page.locator('[name="clientId"]').selectOption({label:"Cliente Prueba Murray"});
  await page.locator('[name="eventTypeId"]').selectOption({label:"Cumpleaños 50"});
  await page.locator('[name="eventDate"]').fill("2026-12-12");
  await page.locator('[name="guestCount"]').fill("100");
  await page.locator('[name="startTime"]').fill("21:00");
  await page.locator('[name="endTime"]').fill("03:00");
  await page.locator('[name="venue"]').fill("SUM La Comarca");
  await page.getByRole("button",{name:"Crear y agregar servicios"}).click();
  await expect(page).toHaveURL(/presupuestos\/[0-9a-f-]+\/editar/);
  const quoteId=page.url().split("/").at(-2)!;
  await addCatalogItem(page,"Servicio","DJ Micky 2 horas");
  await addCatalogItem(page,"Adicional","Cabina DJ pantalla LED");
  await addCatalogItem(page,"Adicional","CO2 2 tubos");
  await expect(page.getByText("$ 5.750.000",{exact:false}).last()).toBeVisible();
  await expect(page.getByText("$ 2.875.000",{exact:false}).first()).toBeVisible();
  await page.getByRole("button",{name:"Guardar nueva versión"}).click();
  await page.waitForURL(new RegExp(`/presupuestos/${quoteId}$`));
  await expect(page.getByRole("heading",{name:"Versión 1"})).toBeVisible();

  await page.getByRole("link",{name:"+ Nueva versión"}).click();
  await addCatalogItem(page,"Adicional","Bola espejada");
  await page.getByRole("button",{name:"Guardar nueva versión"}).click();
  await page.waitForURL(new RegExp(`/presupuestos/${quoteId}$`));
  await expect(page.getByRole("heading",{name:"Versión 2"})).toBeVisible();
  await expect(page.getByRole("heading",{name:"Versión 1"})).toBeVisible();
  await expect(page.getByText("$ 5.900.000",{exact:false}).first()).toBeVisible();

  await page.getByRole("link",{name:"+ Nueva versión"}).click();
  const totalsForm=page.locator("section.card.form");await totalsForm.locator("select").nth(0).selectOption("FIXED");
  await totalsForm.locator('input[type="number"]').nth(0).fill("150000");
  await page.getByRole("button",{name:"Guardar nueva versión"}).click();
  await page.waitForURL(new RegExp(`/presupuestos/${quoteId}$`));
  await expect(page.getByRole("heading",{name:"Versión 3"})).toBeVisible();
  await expect(page.getByText("$ 5.750.000",{exact:false}).first()).toBeVisible();

  await page.locator('[name="status"]').selectOption("PRESUPUESTO_ENVIADO");await page.getByRole("button",{name:"Cambiar estado"}).click();await expect(page.getByText("PRESUPUESTO ENVIADO",{exact:true})).toBeVisible();

  const latestCard=page.locator("article.card").first();
  await expect(latestCard.locator('[name="setupTime"]')).toHaveValue("18:30");
  await latestCard.getByRole("button",{name:"Confirmar esta versión y crear evento"}).click();
  await expect(page).toHaveURL(/eventos\/[0-9a-f-]+$/);
  await expect(page.getByText("EVT-2026-",{exact:false})).toBeVisible();
  await expect(page.getByText("Armado:").locator("..")).toContainText("18:30");
  const firstQuote=await db.quote.findUniqueOrThrow({where:{id:quoteId},include:{versions:{orderBy:{versionNumber:"asc"}},event:true}});
  expect(firstQuote.status).toBe("CONFIRMADO");expect(firstQuote.versions).toHaveLength(3);expect(String(firstQuote.versions[0].totalFinal)).toBe("5750000");expect(String(firstQuote.versions[1].totalFinal)).toBe("5900000");expect(String(firstQuote.versions[2].totalFinal)).toBe("5750000");expect(firstQuote.event?.sourceQuoteVersionId).toBe(firstQuote.versions[2].id);
  expect(await db.event.count({where:{sourceQuoteId:quoteId}})).toBe(1);
  await page.goto(`/presupuestos/${quoteId}`);await expect(page.getByRole("button",{name:/Confirmar esta versión/})).toHaveCount(0);expect(await db.event.count({where:{sourceQuoteId:quoteId}})).toBe(1);
  await page.goto("/agenda?month=2026-12");await expect(page.getByText("Cliente Prueba Murray",{exact:false}).first()).toBeVisible();
  await page.goto("/dashboard?from=2026-12-01&to=2026-12-31");await expect(page.locator(".dashboard-card").filter({hasText:"Eventos del período"})).toContainText("1");

  await page.goto("/clientes/nuevo");await page.getByLabel("Nombre / razón social *").fill("Empresa Prueba Murray");await page.getByLabel("Tipo").selectOption("EMPRESA");await page.getByRole("button",{name:"Guardar cliente"}).click();await expect(page).toHaveURL(/clientes\/[0-9a-f-]+$/);
  await page.goto("/presupuestos/nuevo");await page.locator('[name="clientId"]').selectOption({label:"Empresa Prueba Murray"});await page.locator('[name="eventTypeId"]').selectOption({label:"Corporativo"});await page.locator('[name="eventDate"]').fill("2027-01-15");await page.locator('[name="startTime"]').fill("20:00");await page.locator('[name="endTime"]').fill("01:00");await page.locator('[name="venue"]').fill("Centro Corporativo");await page.getByRole("button",{name:"Crear y agregar servicios"}).click();
  await addCatalogItem(page,"Servicio","DJ Micky 2 horas");await page.locator("section.card.form select").nth(1).selectOption("21");
  await expect(page.getByText("$ 420.000",{exact:false})).toBeVisible();await expect(page.getByText("$ 2.420.000",{exact:false})).toBeVisible();await expect(page.getByText("$ 1.210.000",{exact:false}).first()).toBeVisible();await page.getByRole("button",{name:"Guardar nueva versión"}).click();

  await logout(page);await login(page,"maicky@murraydjs.local");await page.goto("/clientes");await expect(page.getByText("Cliente Prueba Murray").first()).toBeVisible();await page.goto("/usuarios");await expect(page).toHaveURL(/sin-acceso/);
  await logout(page);await login(page,"paddy@murraydjs.local");for(const path of ["/usuarios","/presupuestos","/catalogo","/dashboard"]){await page.goto(path);await expect(page).toHaveURL(/sin-acceso/);await expect(page.getByText("Sin acceso")).toBeVisible();}

  const audit=await db.auditLog.findMany({where:{OR:[{entityId:quoteId},{entity:"Client"},{entity:"Event"}]}});expect(audit.some(x=>x.entity==="Client"&&x.action==="CREATE")).toBe(true);expect(audit.some(x=>x.entity==="Client"&&x.action==="UPDATE")).toBe(true);expect(audit.filter(x=>x.action==="CREATE_VERSION"&&x.entityId===quoteId)).toHaveLength(3);expect(audit.some(x=>x.action==="STATUS_CHANGE"&&x.entityId===quoteId)).toBe(true);expect(audit.some(x=>x.action==="CONFIRM_AND_CREATE_EVENT"&&x.entityId===quoteId)).toBe(true);expect(audit.some(x=>x.entity==="Event"&&x.action==="CREATE")).toBe(true);
  expect(clientUrl).toContain("/clientes/");
});

test("flujo integrado, edición y filtros",async({page})=>{
  const suffix=Date.now(); const clientName=`Cliente Integrado ${suffix}`;
  await login(page,"miguel@murraydjs.local");
  await page.goto("/presupuestos/nuevo");
  await page.getByRole("radio",{name:"Nuevo cliente"}).check();
  await page.getByLabel("Nombre / razón social *").fill(clientName);
  await page.getByLabel("Tipo *").selectOption("PARTICULAR");
  await page.getByLabel("Tipo de evento *").selectOption({label:"Cumpleaños"});
  await page.getByLabel("Fecha *").fill("2027-03-20");
  await page.getByLabel("Inicio *").fill("21:00"); await page.getByLabel("Finalización *").fill("03:00");
  await page.getByLabel("Lugar *").fill("Salón Integrado");
  await page.getByRole("button",{name:"Crear y agregar servicios"}).click();
  await addCatalogItem(page,"Servicio","DJ Micky 2 horas");
  await page.getByRole("button",{name:"Guardar nueva versión"}).click();
  await page.getByText("Editar datos del presupuesto").click();
  await page.locator('.edit-quote [name="venue"]').fill("Salón Integrado Editado");
  await page.locator('.edit-quote [name="guestCount"]').fill("80");
  await page.getByRole("button",{name:"Guardar datos"}).click();
  await expect(page.getByText("Salón Integrado Editado")).toBeVisible();

  await page.goto("/dashboard"); await page.getByText("Filtrar período").click(); await page.getByLabel("Desde").fill("2027-03-01"); await page.getByLabel("Hasta").fill("2027-03-31");
  await page.getByLabel("Cliente").selectOption({label:clientName}); await page.getByRole("button",{name:"Aplicar filtros"}).click();
  await expect(page.getByLabel("Cliente").locator("option:checked")).toHaveText(clientName);

  await page.goto("/catalogo"); const service=page.locator("details.catalog-item").filter({hasText:"DJ Micky 2 horas"}); await service.locator("summary").click();
  await service.locator('[name="category"]').fill("DJ E2E"); await service.getByRole("button",{name:"Guardar cambios"}).click();
  await expect(service.getByText("DJ E2E")).toBeVisible(); await service.locator('[name="category"]').fill("DJ"); await service.getByRole("button",{name:"Guardar cambios"}).click();

  const created=await db.quote.findFirstOrThrow({where:{client:{name:clientName}},include:{versions:true}});
  expect(created.venue).toBe("Salón Integrado Editado"); expect(created.guestCount).toBe(80); expect(created.versions).toHaveLength(1);
  expect(await db.auditLog.count({where:{entity:"Quote",entityId:created.id,action:"UPDATE"}})).toBe(1);
});
