import { expect, test } from "@playwright/test";
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
const password = process.env.SEED_DEMO_PASSWORD || "MurraySprint1-DEV!";

test.afterAll(() => db.$disconnect());

test("crea un evento directo con precio y encargado", async ({ page }) => {
  const clientName = `Evento Directo ${Date.now()}`;
  await page.goto("/login");
  await page.getByLabel("Email").fill("miguel@murraydjs.local");
  await page.getByLabel("Contraseña").fill(password);
  await page.getByRole("button", { name: "Ingresar" }).click();
  await page.waitForURL("**/dashboard");
  await page.goto("/eventos/nuevo");
  await page.getByRole("radio", { name: "Nuevo cliente" }).check();
  await page.getByLabel("Nombre / razón social *").fill(clientName);
  await page.getByLabel("Tipo de evento *").selectOption({ label: "Cumpleaños" });
  await page.getByLabel("Fecha *").fill("2027-05-20");
  await page.getByLabel("Lugar *").fill("Salón Evento Directo");
  await page.getByLabel("Inicio *").fill("21:00");
  await page.getByLabel("Finalización *").fill("03:00");
  await page.getByLabel("Encargado").selectOption({ label: "Maicky" });
  await page.getByLabel("Importe sin IVA *").fill("1000000");
  await page.getByLabel("IVA", { exact: true }).selectOption("21");
  await page.getByLabel("Seña pactada (%)").fill("30");
  await page.getByRole("button", { name: "Crear evento" }).click();
  await expect(page).toHaveURL(/\/eventos\/[0-9a-f-]+$/, { timeout: 20_000 });
  await expect(page.getByText("Precio acordado")).toBeVisible();
  await expect(page.locator(".card").filter({ hasText: "Precio acordado" })).toContainText("$ 1.210.000");
  await expect(page.getByLabel("Encargado operativo")).toHaveValue(/.+/);

  const event = await db.event.findFirstOrThrow({ where: { client: { name: clientName } }, include: { sourceQuote: true, sourceQuoteVersion: true, managerStaff: true } });
  expect(event.sourceQuote?.confirmedVersionId).toBe(event.sourceQuoteVersionId);
  expect(String(event.sourceQuoteVersion?.taxableBase)).toBe("1000000");
  expect(String(event.sourceQuoteVersion?.totalFinal)).toBe("1210000");
  expect(event.managerStaff?.name).toBe("Maicky");
});
