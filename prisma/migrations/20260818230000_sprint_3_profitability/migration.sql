CREATE TYPE "ExpensePaymentMethod" AS ENUM ('CASH', 'TRANSFER', 'DEBIT_CARD', 'CREDIT_CARD', 'MERCADO_PAGO', 'OTHER');
CREATE TYPE "ExpenseStatus" AS ENUM ('ACTIVE', 'VOID');
CREATE TYPE "FinancialStatus" AS ENUM ('OPEN', 'READY_TO_CLOSE', 'CLOSED');

ALTER TABLE "Event"
  ADD COLUMN "financialStatus" "FinancialStatus" NOT NULL DEFAULT 'OPEN',
  ADD COLUMN "financialClosedAt" TIMESTAMP(3),
  ADD COLUMN "financialClosedById" UUID;

CREATE TABLE "ExpenseCategory" (
  "id" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ExpenseCategory_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EventExpense" (
  "id" UUID NOT NULL,
  "eventId" UUID NOT NULL,
  "categoryId" UUID NOT NULL,
  "quoteItemId" UUID,
  "description" TEXT NOT NULL,
  "amount" DECIMAL(18,2) NOT NULL,
  "currency" "Currency" NOT NULL,
  "expenseDate" DATE NOT NULL,
  "paidByStaffId" UUID,
  "paymentMethod" "ExpensePaymentMethod",
  "receiptUrl" TEXT,
  "notes" TEXT,
  "status" "ExpenseStatus" NOT NULL DEFAULT 'ACTIVE',
  "createdById" UUID NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "voidedAt" TIMESTAMP(3),
  "voidedById" UUID,
  "voidReason" TEXT,
  CONSTRAINT "EventExpense_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ExpenseCategory_name_key" ON "ExpenseCategory"("name");
CREATE UNIQUE INDEX "ExpenseCategory_slug_key" ON "ExpenseCategory"("slug");
CREATE INDEX "ExpenseCategory_active_sortOrder_idx" ON "ExpenseCategory"("active", "sortOrder");
CREATE INDEX "EventExpense_eventId_status_currency_idx" ON "EventExpense"("eventId", "status", "currency");
CREATE INDEX "EventExpense_categoryId_expenseDate_idx" ON "EventExpense"("categoryId", "expenseDate");
CREATE INDEX "EventExpense_paidByStaffId_idx" ON "EventExpense"("paidByStaffId");
CREATE INDEX "EventExpense_quoteItemId_idx" ON "EventExpense"("quoteItemId");
CREATE INDEX "Event_financialStatus_eventDate_idx" ON "Event"("financialStatus", "eventDate");

ALTER TABLE "Event" ADD CONSTRAINT "Event_financialClosedById_fkey" FOREIGN KEY ("financialClosedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "EventExpense" ADD CONSTRAINT "EventExpense_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "EventExpense" ADD CONSTRAINT "EventExpense_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ExpenseCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "EventExpense" ADD CONSTRAINT "EventExpense_quoteItemId_fkey" FOREIGN KEY ("quoteItemId") REFERENCES "QuoteItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "EventExpense" ADD CONSTRAINT "EventExpense_paidByStaffId_fkey" FOREIGN KEY ("paidByStaffId") REFERENCES "Staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "EventExpense" ADD CONSTRAINT "EventExpense_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "EventExpense" ADD CONSTRAINT "EventExpense_voidedById_fkey" FOREIGN KEY ("voidedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
