import { PrismaClient } from "@prisma/client";

const databaseUrl = process.env.DATABASE_URL ?? "";
if (!databaseUrl.includes("/murray_djs_e2e?")) {
  throw new Error("Seguridad: E2E requiere la base dedicada murray_djs_e2e.");
}

async function main() {
  const adminUrl = new URL(databaseUrl);
  adminUrl.pathname = "/postgres";
  const admin = new PrismaClient({ datasourceUrl: adminUrl.toString() });
  try {
    const rows = await admin.$queryRaw<Array<{ exists: boolean }>>`SELECT EXISTS(SELECT 1 FROM pg_database WHERE datname = 'murray_djs_e2e') AS "exists"`;
    if (!rows[0]?.exists) await admin.$executeRawUnsafe('CREATE DATABASE "murray_djs_e2e"');
  } finally {
    await admin.$disconnect();
  }
}

main().catch((error) => { console.error(error); process.exit(1); });
