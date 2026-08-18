import EmbeddedPostgres from "embedded-postgres";
import { existsSync } from "node:fs";

const localPostgresPassword = process.env.LOCAL_POSTGRES_PASSWORD;
if (!localPostgresPassword) throw new Error("LOCAL_POSTGRES_PASSWORD es obligatorio para PostgreSQL local");

const pg = new EmbeddedPostgres({
  databaseDir: ".dev-postgres/data",
  user: "murray",
  password: localPostgresPassword,
  port: 5432,
  persistent: true,
  onLog: (message) => console.log(message),
  onError: (error) => console.error(error),
});

async function shutdown() { await pg.stop(); process.exit(0); }
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

async function main() {
  if (!existsSync(".dev-postgres/data/PG_VERSION")) await pg.initialise();
  await pg.start();
  try { await pg.createDatabase("murray_djs"); } catch (error) {
    if (!String(error).includes("already exists")) throw error;
  }
  console.log("Murray DJs PostgreSQL listo en 127.0.0.1:5432");
  await new Promise(() => {});
}
main().catch((error) => { console.error(error); process.exit(1); });
