-- Imported events have no commercial quote version. Existing references stay intact.
ALTER TABLE "ClientPayment" ALTER COLUMN "quoteVersionId" DROP NOT NULL;
ALTER TABLE "ClientPayment" ADD CONSTRAINT "ClientPayment_commercial_reference_check"
  CHECK ("quoteVersionId" IS NOT NULL OR ("eventId" IS NOT NULL AND "quoteId" IS NULL));
