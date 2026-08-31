import { expect, test } from "@playwright/test";

const password = process.env.SEED_DEMO_PASSWORD!;

test("OPERACIONES accede al circuito operativo sin ver administración ni reportes", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("luis@murraydjs.local");
  await page.getByLabel("Contraseña").fill(password);
  await page.getByRole("button", { name: "Ingresar" }).click();
  await page.waitForURL("**/eventos");

  for (const path of ["/eventos", "/agenda", "/clientes", "/presupuestos", "/personal"]) {
    await page.goto(path);
    await expect(page).not.toHaveURL(/sin-acceso/);
  }

  for (const path of ["/usuarios", "/catalogo", "/dashboard", "/tesoreria", "/reportes/rentabilidad"]) {
    await page.goto(path);
    await expect(page).toHaveURL(/sin-acceso/);
  }
});
