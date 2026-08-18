import { PrismaClient } from "@prisma/client";

const KEEP_CLIENT_NAME = "Magui Llavallol";

async function main() {
  const databaseUrl = process.env.DATABASE_URL ?? "";
  if (!databaseUrl.includes("/murray_djs?")) {
    throw new Error("Seguridad: este script sólo puede ejecutarse sobre murray_djs.");
  }

  const prisma = new PrismaClient();
  try {
    const keep = await prisma.client.findFirstOrThrow({
      where: { name: { equals: KEEP_CLIENT_NAME, mode: "insensitive" } },
      include: {
        quotes: {
          include: {
            versions: { include: { items: true } },
            event: { include: { staffAssignments: true, staffPayments: true } },
          },
        },
      },
    });

    const quoteIds = keep.quotes.map((quote) => quote.id);
    const versionIds = keep.quotes.flatMap((quote) => quote.versions.map((version) => version.id));
    const itemIds = keep.quotes.flatMap((quote) => quote.versions.flatMap((version) => version.items.map((item) => item.id)));
    const eventIds = keep.quotes.flatMap((quote) => quote.event ? [quote.event.id] : []);
    const assignmentIds = keep.quotes.flatMap((quote) => quote.event?.staffAssignments.map((assignment) => assignment.id) ?? []);
    const paymentIds = keep.quotes.flatMap((quote) => quote.event?.staffPayments.map((payment) => payment.id) ?? []);
    const preservedEntityIds = [keep.id, ...quoteIds, ...versionIds, ...itemIds, ...eventIds, ...assignmentIds, ...paymentIds];

    const deleted = await prisma.$transaction(async (tx) => {
      const payments = await tx.staffPayment.deleteMany({ where: { id: { notIn: paymentIds } } });
      const assignments = await tx.eventStaff.deleteMany({ where: { id: { notIn: assignmentIds } } });
      const events = await tx.event.deleteMany({ where: { id: { notIn: eventIds } } });
      await tx.quote.updateMany({ where: { id: { notIn: quoteIds } }, data: { confirmedVersionId: null } });
      const items = await tx.quoteItem.deleteMany({ where: { id: { notIn: itemIds } } });
      const versions = await tx.quoteVersion.deleteMany({ where: { id: { notIn: versionIds } } });
      const quotes = await tx.quote.deleteMany({ where: { id: { notIn: quoteIds } } });
      const clients = await tx.client.deleteMany({ where: { id: { not: keep.id } } });
      const audits = await tx.auditLog.deleteMany({ where: { entityId: { notIn: preservedEntityIds } } });

      await tx.numberSequence.deleteMany();
      const sequences = new Map<string, { entity: string; year: number; value: number }>();
      for (const quote of keep.quotes) {
        const quoteNumber = /^PRE-(\d{4})-(\d+)$/.exec(quote.number);
        if (quoteNumber) sequences.set(`QUOTE-${quoteNumber[1]}`, { entity: "QUOTE", year: Number(quoteNumber[1]), value: Number(quoteNumber[2]) });
        const eventNumber = quote.event && /^EVT-(\d{4})-(\d+)$/.exec(quote.event.number);
        if (eventNumber) sequences.set(`EVENT-${eventNumber[1]}`, { entity: "EVENT", year: Number(eventNumber[1]), value: Number(eventNumber[2]) });
      }
      for (const sequence of sequences.values()) await tx.numberSequence.create({ data: sequence });

      return { payments: payments.count, assignments: assignments.count, events: events.count, items: items.count, versions: versions.count, quotes: quotes.count, clients: clients.count, audits: audits.count };
    });

    console.log(JSON.stringify({
      preserved: { client: keep.name, clientId: keep.id, quotes: keep.quotes.map((quote) => ({ number: quote.number, status: quote.status, event: quote.event?.number ?? null, versions: quote.versions.length })) },
      deleted,
    }, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => { console.error(error); process.exit(1); });
