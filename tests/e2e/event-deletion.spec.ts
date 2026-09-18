import { randomUUID } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
test.afterAll(() => db.$disconnect());
async function login(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Contraseña").fill(process.env.SEED_DEMO_PASSWORD!);
  await page.getByRole("button", { name: "Ingresar" }).click();
  await page.waitForURL(/\/(dashboard|eventos|staff)$/);
}
async function fixture() {
  const user = await db.user.findFirstOrThrow({ where: { role: "ADMIN" } });
  const type = await db.eventType.findFirstOrThrow();
  const client = await db.client.create({ data: { name: "Evento importado por error", type: "PARTICULAR" } });
  return db.event.create({ data: {
    number: `EVT-DEL-${randomUUID()}`, clientId: client.id, eventTypeId: type.id, source: "EXCEL_IMPORT",
    eventDate: new Date("2027-10-03"), startTime: "21:00", endTime: "03:00", venue: "Salón duplicado",
    legacyFinancialData: { create: { sourceSheet: "2027", sourceRow: 4, saleArs: "1000" } },
    excelImportRecord: { create: { fileHash: randomUUID(), sheetName: "2027", rowNumber: 4, importedById: user.id } },
  } });
}
test("financial management can delete an imported mistake, removing it from agenda and list", async ({ page }) => {
  const event = await fixture();
  await login(page, "maicky@murraydjs.local");
  await page.goto(`/eventos/${event.id}`);
  await page.getByRole("button", { name: "Eliminar evento", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Motivo de eliminación").fill("Fila importada duplicada");
  await dialog.getByRole("button", { name: "Confirmar eliminación" }).click();
  await expect(page).toHaveURL(/eliminado=1/);
  expect(await db.event.count({ where: { id: event.id } })).toBe(0);
  expect(await db.excelImportRecord.count({ where: { eventId: event.id } })).toBe(0);
  await page.goto(`/eventos?q=${event.number}`);
  await expect(page.getByText("No encontramos eventos")).toBeVisible();
  await page.goto("/agenda?month=2027-10");
  await expect(page.locator(`a[href="/eventos/${event.id}"]`)).toHaveCount(0);
});
test("financial history blocks deletion; operations and staff cannot delete", async ({ page }) => {
  const event = await fixture();
  const actor = await db.user.findFirstOrThrow({ where: { role: "ADMIN" } });
  const staff = await db.staff.findFirstOrThrow();
  await db.staffPayment.create({ data: { staffId: staff.id, eventId: event.id, amount: "25.50", currency: "ARS", paymentDate: event.eventDate, paymentMethod: "CASH", paymentType: "PARTIAL", createdById: actor.id } });
  await login(page, "miguel@murraydjs.local");
  await page.goto(`/eventos/${event.id}`);
  await page.getByRole("button", { name: "Eliminar evento", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Motivo de eliminación").fill("Carga equivocada");
  const submitted = page.waitForRequest(request => request.method() === "POST" && Boolean(request.headers()["next-action"]));
  await dialog.getByRole("button", { name: "Confirmar eliminación" }).click();
  const request = await submitted;
  await expect(dialog.getByRole("alert")).toContainText("historial financiero");
  expect(await db.event.count({ where: { id: event.id } })).toBe(1);
  for (const email of ["luis@murraydjs.local", "paddy@murraydjs.local"]) {
    await page.context().clearCookies();
    await login(page, email);
    await page.goto(`/eventos/${event.id}`);
    await expect(page.getByRole("button", { name: "Eliminar evento", exact: true })).toHaveCount(0);
    if (email.startsWith("paddy")) await expect(page).toHaveURL(/sin-acceso/);
    const response = await page.request.post(`/eventos/${event.id}`, { headers: { "next-action": request.headers()["next-action"], "content-type": request.headers()["content-type"] }, data: request.postDataBuffer()! });
    expect(response.headers()["x-action-redirect"]).toContain("/sin-acceso");
    expect(await db.event.count({ where: { id: event.id } })).toBe(1);
  }
});
