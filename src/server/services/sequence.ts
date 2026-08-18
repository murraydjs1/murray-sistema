import type { Prisma } from "@prisma/client";
export async function nextNumber(tx: Prisma.TransactionClient, entity: "QUOTE" | "EVENT", date = new Date()) {
  const year = date.getUTCFullYear();
  const rows = await tx.$queryRaw<Array<{ value: number }>>`
    INSERT INTO "NumberSequence" ("entity", "year", "value") VALUES (${entity}, ${year}, 1)
    ON CONFLICT ("entity", "year") DO UPDATE SET "value" = "NumberSequence"."value" + 1
    RETURNING "value"`;
  const prefix = entity === "QUOTE" ? "PRE" : "EVT";
  return `${prefix}-${year}-${String(rows[0].value).padStart(4, "0")}`;
}
