import { Prisma, PrismaClient } from "@prisma/client";
import { premium200AddOns, premium200Service } from "@/lib/catalog/premium-200";

type CatalogPreset = { code: string; name: string; category: string; description: string; listPrice: string; currency: "ARS" | "USD" };

async function upsertService(tx: Prisma.TransactionClient, preset: CatalogPreset) {
  const existing = await tx.service.findFirst({ where: { OR: [{ code: preset.code }, { name: preset.name }] }, orderBy: { createdAt: "asc" } });
  const data = { ...preset, active: true };
  return existing ? tx.service.update({ where: { id: existing.id }, data }) : tx.service.create({ data });
}

async function upsertAddOn(tx: Prisma.TransactionClient, preset: CatalogPreset) {
  const existing = await tx.addOn.findFirst({ where: { OR: [{ code: preset.code }, { name: preset.name }] }, orderBy: { createdAt: "asc" } });
  const data = { ...preset, active: true };
  return existing ? tx.addOn.update({ where: { id: existing.id }, data }) : tx.addOn.create({ data });
}

const migrations = [{
  key: "2026-08-25-premium-200-catalog",
  async apply(tx: Prisma.TransactionClient) {
    await upsertService(tx, premium200Service);
    for (const addOn of premium200AddOns) await upsertAddOn(tx, addOn);
  },
}] as const;

export async function applyDataMigrations(prisma: PrismaClient) {
  const applied: string[] = [];
  await prisma.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(2026082501)`;
    for (const migration of migrations) {
      if (await tx.dataMigration.findUnique({ where: { key: migration.key } })) continue;
      await migration.apply(tx);
      await tx.dataMigration.create({ data: { key: migration.key } });
      applied.push(migration.key);
    }
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  return applied;
}
