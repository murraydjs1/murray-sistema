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
}, {
  key: "2026-08-25-micky-special-proposal-options",
  async apply(tx: Prisma.TransactionClient) {
    for (const addOn of premium200AddOns) await upsertAddOn(tx, addOn);
    await tx.service.updateMany({
      where: { name: { in: ["DJ Micky 2 horas", "DJ Micky 4 horas"] } },
      data: { active: false },
    });
    const version = await tx.quoteVersion.findFirst({ where: { quote: { number: "PRE-2026-0006" }, versionNumber: 1 } });
    if (!version) return;
    await tx.quoteProposalOption.upsert({ where: { quoteVersionId_code: { quoteVersionId: version.id, code: "dj-micky-2h" } }, update: { description: "DJ Set de Micky Murray durante 2 horas.", listPrice: "1500000", currency: "ARS", sortOrder: 90 }, create: { quoteVersionId: version.id, code: "dj-micky-2h", description: "DJ Set de Micky Murray durante 2 horas.", listPrice: "1500000", currency: "ARS", sortOrder: 90 } });
    await tx.quoteProposalOption.upsert({ where: { quoteVersionId_code: { quoteVersionId: version.id, code: "dj-micky-4h" } }, update: { description: "DJ Set de Micky Murray durante 4 horas.", listPrice: "2500000", currency: "ARS", sortOrder: 91 }, create: { quoteVersionId: version.id, code: "dj-micky-4h", description: "DJ Set de Micky Murray durante 4 horas.", listPrice: "2500000", currency: "ARS", sortOrder: 91 } });
  },
}, {
  key: "2026-08-25-premium-options-copy-and-price",
  async apply(tx: Prisma.TransactionClient) {
    for (const addOn of premium200AddOns) await upsertAddOn(tx, addOn);
    const version = await tx.quoteVersion.findFirst({ where: { quote: { number: "PRE-2026-0006" }, versionNumber: 1 } });
    if (!version) return;
    await tx.quoteProposalOption.updateMany({ where: { quoteVersionId: version.id, code: "dj-micky-2h" }, data: { description: "DJ Set de Micky Murray durante 2 horas." } });
    await tx.quoteProposalOption.updateMany({ where: { quoteVersionId: version.id, code: "dj-micky-4h" }, data: { description: "DJ Set de Micky Murray durante 4 horas." } });
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
