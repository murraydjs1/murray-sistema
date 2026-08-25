import { PrismaClient } from "@prisma/client";
import { applyDataMigrations } from "@/server/catalog/data-migrations";

async function main() {
  const prisma = new PrismaClient();
  try {
    const applied = await applyDataMigrations(prisma);
    console.log(applied.length ? `Migraciones de datos aplicadas: ${applied.join(", ")}` : "No hay migraciones de datos pendientes.");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(error => { console.error(error instanceof Error ? error.message : error); process.exit(1); });
