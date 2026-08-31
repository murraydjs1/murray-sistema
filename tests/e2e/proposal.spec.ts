import { expect, test } from "@playwright/test";
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
const password = process.env.SEED_DEMO_PASSWORD || "MurraySprint1-DEV!";

test.afterAll(async () => db.$disconnect());

test("arma una propuesta, copia el mensaje y abre una versión imprimible", async ({ page }) => {
  const clientName = `Cliente Propuesta ${Date.now()}`;
  await page.goto("/login");
  await page.getByLabel("Email").fill("miguel@murraydjs.local");
  await page.getByLabel("Contraseña").fill(password);
  await page.getByRole("button", { name: "Ingresar" }).click();
  await page.waitForURL("**/dashboard");

  await page.goto("/presupuestos/nuevo");
  await page.getByRole("radio", { name: "Nuevo cliente" }).check();
  await page.getByLabel("Nombre / razón social *").fill(clientName);
  await page.getByLabel("Tipo de evento *").selectOption({ label: "Cumpleaños 50" });
  await page.getByLabel("Fecha *").fill("2027-06-26");
  await page.getByLabel("Invitados").fill("100");
  await page.getByLabel("Lugar *").fill("SUM La Comarca");
  await page.getByLabel("Inicio *").fill("21:00");
  await page.getByLabel("Finalización *").fill("03:00");
  await page.getByRole("button", { name: "Crear y agregar servicios" }).click();

  await page.getByRole("button", { name: "Producción estándar" }).click();
  await page.getByRole("button", { name: "Guardar nueva versión" }).click();
  await expect(page.getByRole("heading", { name: "Versión 1" })).toBeVisible();

  await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.getByRole("button", { name: "Copiar WhatsApp" }).click();
  await expect(page.getByRole("button", { name: "Mensaje copiado" })).toBeVisible();
  await expect(page.getByText("PRESUPUESTO ENVIADO", { exact: true })).toBeVisible();

  const popupPromise = page.waitForEvent("popup");
  await page.getByRole("button", { name: "Abrir para PDF" }).click();
  const proposal = await popupPromise;
  await proposal.waitForLoadState();
  await expect(proposal.getByRole("heading", { name: "Cumpleaños 50 · Producción técnica" })).toBeVisible();
  await expect(proposal.getByText("Producción para fiestas de 50").first()).toBeVisible();
  await expect(proposal.getByRole("button", { name: "Imprimir o guardar PDF" })).toBeVisible();

  const quote = await db.quote.findFirstOrThrow({ where: { client: { name: clientName } } });
  expect(quote.status).toBe("PRESUPUESTO_ENVIADO");
  expect(await db.auditLog.count({ where: { entity: "Quote", entityId: quote.id, action: "PROPOSAL_SHARED" } })).toBeGreaterThan(0);
});
