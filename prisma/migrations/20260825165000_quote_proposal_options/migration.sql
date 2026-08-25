CREATE TABLE "QuoteProposalOption" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "quoteVersionId" UUID NOT NULL,
  "code" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "listPrice" DECIMAL(18,2) NOT NULL,
  "currency" "Currency" NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "QuoteProposalOption_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "QuoteProposalOption_quoteVersionId_code_key" ON "QuoteProposalOption"("quoteVersionId", "code");
CREATE INDEX "QuoteProposalOption_quoteVersionId_sortOrder_idx" ON "QuoteProposalOption"("quoteVersionId", "sortOrder");
ALTER TABLE "QuoteProposalOption" ADD CONSTRAINT "QuoteProposalOption_quoteVersionId_fkey" FOREIGN KEY ("quoteVersionId") REFERENCES "QuoteVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
