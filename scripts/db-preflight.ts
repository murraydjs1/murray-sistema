import { PrismaClient } from "@prisma/client";
import { databaseUrlError } from "@/lib/database-url";

async function main() {
  const error = databaseUrlError(process.env.DATABASE_URL);
  if (error) throw new Error(`Release bloqueado: ${error}`);
  const prisma = new PrismaClient({ datasourceUrl: process.env.DATABASE_URL });
  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log("Conexión PostgreSQL de release verificada.");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(error => { console.error(error instanceof Error ? error.message : error); process.exit(1); });
