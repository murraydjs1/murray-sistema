CREATE TYPE "EventSource" AS ENUM ('SYSTEM', 'EXCEL_IMPORT');

ALTER TABLE "Event"
  ADD COLUMN "source" "EventSource" NOT NULL DEFAULT 'SYSTEM',
  ALTER COLUMN "sourceQuoteId" DROP NOT NULL,
  ALTER COLUMN "sourceQuoteVersionId" DROP NOT NULL;

CREATE TABLE "EventLegacyFinancialData" (
  "id" UUID NOT NULL,
  "eventId" UUID NOT NULL,
  "saleArs" DECIMAL(18,2),
  "saleUsd" DECIMAL(18,2),
  "depositArs" DECIMAL(18,2),
  "depositUsd" DECIMAL(18,2),
  "costArs" DECIMAL(18,2),
  "costUsd" DECIMAL(18,2),
  "resultArs" DECIMAL(18,2),
  "resultUsd" DECIMAL(18,2),
  "priceFormula" TEXT,
  "notes" TEXT,
  "sourceSheet" TEXT NOT NULL,
  "sourceRow" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EventLegacyFinancialData_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ExcelImportRecord" (
  "id" UUID NOT NULL,
  "fileHash" TEXT NOT NULL,
  "sheetName" TEXT NOT NULL,
  "rowNumber" INTEGER NOT NULL,
  "eventId" UUID NOT NULL,
  "importedById" UUID NOT NULL,
  "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ExcelImportRecord_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "EventLegacyFinancialData_eventId_key" ON "EventLegacyFinancialData"("eventId");
CREATE INDEX "EventLegacyFinancialData_sourceSheet_sourceRow_idx" ON "EventLegacyFinancialData"("sourceSheet", "sourceRow");
CREATE UNIQUE INDEX "ExcelImportRecord_eventId_key" ON "ExcelImportRecord"("eventId");
CREATE UNIQUE INDEX "ExcelImportRecord_fileHash_sheetName_rowNumber_key" ON "ExcelImportRecord"("fileHash", "sheetName", "rowNumber");
CREATE INDEX "ExcelImportRecord_fileHash_sheetName_idx" ON "ExcelImportRecord"("fileHash", "sheetName");

ALTER TABLE "EventLegacyFinancialData" ADD CONSTRAINT "EventLegacyFinancialData_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ExcelImportRecord" ADD CONSTRAINT "ExcelImportRecord_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ExcelImportRecord" ADD CONSTRAINT "ExcelImportRecord_importedById_fkey" FOREIGN KEY ("importedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
