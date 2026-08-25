ALTER TABLE "Service" ADD COLUMN "code" TEXT;
ALTER TABLE "AddOn" ADD COLUMN "code" TEXT;

CREATE UNIQUE INDEX "Service_code_key" ON "Service"("code");
CREATE UNIQUE INDEX "AddOn_code_key" ON "AddOn"("code");

CREATE TABLE "DataMigration" (
  "id" UUID NOT NULL,
  "key" TEXT NOT NULL,
  "appliedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DataMigration_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DataMigration_key_key" ON "DataMigration"("key");
