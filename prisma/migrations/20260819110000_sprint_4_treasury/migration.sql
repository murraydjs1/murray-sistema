-- CreateEnum
CREATE TYPE "ExpenseCategoryScope" AS ENUM ('EVENT', 'GENERAL', 'BOTH');

-- CreateEnum
CREATE TYPE "FinancialAccountType" AS ENUM ('CASH', 'BANK', 'MERCADO_PAGO', 'THIRD_PARTY', 'OTHER');

-- CreateEnum
CREATE TYPE "TreasuryDirection" AS ENUM ('INFLOW', 'OUTFLOW');

-- CreateEnum
CREATE TYPE "TreasuryCategory" AS ENUM ('OPENING_BALANCE', 'CLIENT_PAYMENT', 'STAFF_PAYMENT', 'EVENT_EXPENSE', 'GENERAL_EXPENSE', 'REIMBURSEMENT', 'TRANSFER', 'INVESTMENT', 'OWNER_WITHDRAWAL', 'OWNER_CONTRIBUTION', 'ADJUSTMENT', 'OTHER');

-- CreateEnum
CREATE TYPE "TreasuryStatus" AS ENUM ('ACTIVE', 'VOID');

-- CreateEnum
CREATE TYPE "ClientPaymentType" AS ENUM ('DEPOSIT', 'PARTIAL', 'BALANCE', 'OTHER');

-- CreateEnum
CREATE TYPE "ClientPaymentMethod" AS ENUM ('TRANSFER', 'CASH', 'MERCADO_PAGO', 'OTHER');

-- CreateEnum
CREATE TYPE "ReimbursementStatus" AS ENUM ('PENDING', 'PAID', 'VOID');

-- CreateEnum
CREATE TYPE "GeneralExpenseType" AS ENUM ('OPERATING', 'INVESTMENT');

-- AlterTable
ALTER TABLE "EventExpense" ADD COLUMN     "accountId" UUID,
ADD COLUMN     "idempotencyKey" UUID,
ADD COLUMN     "treasuryTransactionId" UUID;

-- AlterTable
ALTER TABLE "ExpenseCategory" ADD COLUMN     "scope" "ExpenseCategoryScope" NOT NULL DEFAULT 'EVENT';

-- AlterTable
ALTER TABLE "Quote" ADD COLUMN     "paymentDueDate" DATE;

-- AlterTable
ALTER TABLE "StaffPayment" ADD COLUMN     "accountId" UUID,
ADD COLUMN     "idempotencyKey" UUID,
ADD COLUMN     "treasuryTransactionId" UUID;

-- CreateTable
CREATE TABLE "FinancialAccount" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "type" "FinancialAccountType" NOT NULL,
    "currency" "Currency" NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "includeInAvailableCash" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinancialAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TreasuryTransaction" (
    "id" UUID NOT NULL,
    "accountId" UUID NOT NULL,
    "direction" "TreasuryDirection" NOT NULL,
    "category" "TreasuryCategory" NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "currency" "Currency" NOT NULL,
    "transactionDate" DATE NOT NULL,
    "description" TEXT NOT NULL,
    "referenceType" TEXT,
    "referenceId" TEXT,
    "status" "TreasuryStatus" NOT NULL DEFAULT 'ACTIVE',
    "idempotencyKey" UUID NOT NULL,
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "voidedAt" TIMESTAMP(3),
    "voidedById" UUID,
    "voidReason" TEXT,

    CONSTRAINT "TreasuryTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OpeningBalance" (
    "id" UUID NOT NULL,
    "accountId" UUID NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "balanceDate" DATE NOT NULL,
    "notes" TEXT,
    "idempotencyKey" UUID NOT NULL,
    "treasuryTransactionId" UUID NOT NULL,
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OpeningBalance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientPayment" (
    "id" UUID NOT NULL,
    "clientId" UUID NOT NULL,
    "eventId" UUID,
    "quoteId" UUID,
    "quoteVersionId" UUID NOT NULL,
    "accountId" UUID NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "currency" "Currency" NOT NULL,
    "paymentDate" DATE NOT NULL,
    "paymentMethod" "ClientPaymentMethod" NOT NULL,
    "paymentType" "ClientPaymentType" NOT NULL,
    "notes" TEXT,
    "receivedViaPartner" BOOLEAN NOT NULL DEFAULT false,
    "partnerName" TEXT,
    "status" "PaymentStatus" NOT NULL DEFAULT 'ACTIVE',
    "idempotencyKey" UUID NOT NULL,
    "treasuryTransactionId" UUID NOT NULL,
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "voidedAt" TIMESTAMP(3),
    "voidedById" UUID,
    "voidReason" TEXT,

    CONSTRAINT "ClientPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountTransfer" (
    "id" UUID NOT NULL,
    "fromAccountId" UUID NOT NULL,
    "toAccountId" UUID NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "currency" "Currency" NOT NULL,
    "transferDate" DATE NOT NULL,
    "description" TEXT NOT NULL,
    "status" "TreasuryStatus" NOT NULL DEFAULT 'ACTIVE',
    "idempotencyKey" UUID NOT NULL,
    "outTransactionId" UUID NOT NULL,
    "inTransactionId" UUID NOT NULL,
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "voidedAt" TIMESTAMP(3),
    "voidedById" UUID,
    "voidReason" TEXT,

    CONSTRAINT "AccountTransfer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffReimbursement" (
    "id" UUID NOT NULL,
    "staffId" UUID NOT NULL,
    "eventExpenseId" UUID,
    "generalExpenseId" UUID,
    "amount" DECIMAL(18,2) NOT NULL,
    "currency" "Currency" NOT NULL,
    "status" "ReimbursementStatus" NOT NULL DEFAULT 'PENDING',
    "paidAt" DATE,
    "paymentAccountId" UUID,
    "notes" TEXT,
    "idempotencyKey" UUID NOT NULL,
    "treasuryTransactionId" UUID,
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paidById" UUID,
    "voidedAt" TIMESTAMP(3),
    "voidedById" UUID,
    "voidReason" TEXT,

    CONSTRAINT "StaffReimbursement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GeneralExpense" (
    "id" UUID NOT NULL,
    "categoryId" UUID NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "currency" "Currency" NOT NULL,
    "expenseDate" DATE NOT NULL,
    "type" "GeneralExpenseType" NOT NULL DEFAULT 'OPERATING',
    "accountId" UUID,
    "paidByStaffId" UUID,
    "paymentMethod" "ExpensePaymentMethod",
    "notes" TEXT,
    "status" "ExpenseStatus" NOT NULL DEFAULT 'ACTIVE',
    "idempotencyKey" UUID NOT NULL,
    "treasuryTransactionId" UUID,
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "voidedAt" TIMESTAMP(3),
    "voidedById" UUID,
    "voidReason" TEXT,

    CONSTRAINT "GeneralExpense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OwnerWithdrawal" (
    "id" UUID NOT NULL,
    "staffId" UUID,
    "accountId" UUID NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "currency" "Currency" NOT NULL,
    "withdrawalDate" DATE NOT NULL,
    "notes" TEXT,
    "status" "TreasuryStatus" NOT NULL DEFAULT 'ACTIVE',
    "idempotencyKey" UUID NOT NULL,
    "treasuryTransactionId" UUID NOT NULL,
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "voidedAt" TIMESTAMP(3),
    "voidedById" UUID,
    "voidReason" TEXT,

    CONSTRAINT "OwnerWithdrawal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OwnerContribution" (
    "id" UUID NOT NULL,
    "accountId" UUID NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "currency" "Currency" NOT NULL,
    "contributionDate" DATE NOT NULL,
    "notes" TEXT,
    "status" "TreasuryStatus" NOT NULL DEFAULT 'ACTIVE',
    "idempotencyKey" UUID NOT NULL,
    "treasuryTransactionId" UUID NOT NULL,
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "voidedAt" TIMESTAMP(3),
    "voidedById" UUID,
    "voidReason" TEXT,

    CONSTRAINT "OwnerContribution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinancialSetting" (
    "id" UUID NOT NULL,
    "currency" "Currency" NOT NULL,
    "minimumCashReserve" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "financialTrackingStartDate" DATE,
    "updatedById" UUID NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinancialSetting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FinancialAccount_active_currency_idx" ON "FinancialAccount"("active", "currency");

-- CreateIndex
CREATE UNIQUE INDEX "FinancialAccount_name_currency_key" ON "FinancialAccount"("name", "currency");

-- CreateIndex
CREATE UNIQUE INDEX "TreasuryTransaction_idempotencyKey_key" ON "TreasuryTransaction"("idempotencyKey");

-- CreateIndex
CREATE INDEX "TreasuryTransaction_accountId_transactionDate_status_idx" ON "TreasuryTransaction"("accountId", "transactionDate", "status");

-- CreateIndex
CREATE INDEX "TreasuryTransaction_referenceType_referenceId_idx" ON "TreasuryTransaction"("referenceType", "referenceId");

-- CreateIndex
CREATE INDEX "TreasuryTransaction_category_currency_transactionDate_idx" ON "TreasuryTransaction"("category", "currency", "transactionDate");

-- CreateIndex
CREATE UNIQUE INDEX "OpeningBalance_idempotencyKey_key" ON "OpeningBalance"("idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "OpeningBalance_treasuryTransactionId_key" ON "OpeningBalance"("treasuryTransactionId");

-- CreateIndex
CREATE INDEX "OpeningBalance_accountId_balanceDate_idx" ON "OpeningBalance"("accountId", "balanceDate");

-- CreateIndex
CREATE UNIQUE INDEX "ClientPayment_idempotencyKey_key" ON "ClientPayment"("idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "ClientPayment_treasuryTransactionId_key" ON "ClientPayment"("treasuryTransactionId");

-- CreateIndex
CREATE INDEX "ClientPayment_clientId_paymentDate_idx" ON "ClientPayment"("clientId", "paymentDate");

-- CreateIndex
CREATE INDEX "ClientPayment_eventId_status_idx" ON "ClientPayment"("eventId", "status");

-- CreateIndex
CREATE INDEX "ClientPayment_quoteId_status_idx" ON "ClientPayment"("quoteId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "AccountTransfer_idempotencyKey_key" ON "AccountTransfer"("idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "AccountTransfer_outTransactionId_key" ON "AccountTransfer"("outTransactionId");

-- CreateIndex
CREATE UNIQUE INDEX "AccountTransfer_inTransactionId_key" ON "AccountTransfer"("inTransactionId");

-- CreateIndex
CREATE INDEX "AccountTransfer_transferDate_currency_idx" ON "AccountTransfer"("transferDate", "currency");

-- CreateIndex
CREATE UNIQUE INDEX "StaffReimbursement_eventExpenseId_key" ON "StaffReimbursement"("eventExpenseId");

-- CreateIndex
CREATE UNIQUE INDEX "StaffReimbursement_generalExpenseId_key" ON "StaffReimbursement"("generalExpenseId");

-- CreateIndex
CREATE UNIQUE INDEX "StaffReimbursement_idempotencyKey_key" ON "StaffReimbursement"("idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "StaffReimbursement_treasuryTransactionId_key" ON "StaffReimbursement"("treasuryTransactionId");

-- CreateIndex
CREATE INDEX "StaffReimbursement_staffId_status_currency_idx" ON "StaffReimbursement"("staffId", "status", "currency");

-- CreateIndex
CREATE UNIQUE INDEX "GeneralExpense_idempotencyKey_key" ON "GeneralExpense"("idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "GeneralExpense_treasuryTransactionId_key" ON "GeneralExpense"("treasuryTransactionId");

-- CreateIndex
CREATE INDEX "GeneralExpense_expenseDate_status_currency_idx" ON "GeneralExpense"("expenseDate", "status", "currency");

-- CreateIndex
CREATE UNIQUE INDEX "OwnerWithdrawal_idempotencyKey_key" ON "OwnerWithdrawal"("idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "OwnerWithdrawal_treasuryTransactionId_key" ON "OwnerWithdrawal"("treasuryTransactionId");

-- CreateIndex
CREATE UNIQUE INDEX "OwnerContribution_idempotencyKey_key" ON "OwnerContribution"("idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "OwnerContribution_treasuryTransactionId_key" ON "OwnerContribution"("treasuryTransactionId");

-- CreateIndex
CREATE UNIQUE INDEX "FinancialSetting_currency_key" ON "FinancialSetting"("currency");

-- CreateIndex
CREATE UNIQUE INDEX "EventExpense_treasuryTransactionId_key" ON "EventExpense"("treasuryTransactionId");

-- CreateIndex
CREATE UNIQUE INDEX "EventExpense_idempotencyKey_key" ON "EventExpense"("idempotencyKey");

-- CreateIndex
CREATE INDEX "EventExpense_accountId_idx" ON "EventExpense"("accountId");

-- CreateIndex
CREATE UNIQUE INDEX "StaffPayment_treasuryTransactionId_key" ON "StaffPayment"("treasuryTransactionId");

-- CreateIndex
CREATE UNIQUE INDEX "StaffPayment_idempotencyKey_key" ON "StaffPayment"("idempotencyKey");

-- CreateIndex
CREATE INDEX "StaffPayment_accountId_idx" ON "StaffPayment"("accountId");

-- AddForeignKey
ALTER TABLE "StaffPayment" ADD CONSTRAINT "StaffPayment_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "FinancialAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffPayment" ADD CONSTRAINT "StaffPayment_treasuryTransactionId_fkey" FOREIGN KEY ("treasuryTransactionId") REFERENCES "TreasuryTransaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventExpense" ADD CONSTRAINT "EventExpense_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "FinancialAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventExpense" ADD CONSTRAINT "EventExpense_treasuryTransactionId_fkey" FOREIGN KEY ("treasuryTransactionId") REFERENCES "TreasuryTransaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TreasuryTransaction" ADD CONSTRAINT "TreasuryTransaction_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "FinancialAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TreasuryTransaction" ADD CONSTRAINT "TreasuryTransaction_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TreasuryTransaction" ADD CONSTRAINT "TreasuryTransaction_voidedById_fkey" FOREIGN KEY ("voidedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OpeningBalance" ADD CONSTRAINT "OpeningBalance_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "FinancialAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OpeningBalance" ADD CONSTRAINT "OpeningBalance_treasuryTransactionId_fkey" FOREIGN KEY ("treasuryTransactionId") REFERENCES "TreasuryTransaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OpeningBalance" ADD CONSTRAINT "OpeningBalance_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientPayment" ADD CONSTRAINT "ClientPayment_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientPayment" ADD CONSTRAINT "ClientPayment_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientPayment" ADD CONSTRAINT "ClientPayment_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientPayment" ADD CONSTRAINT "ClientPayment_quoteVersionId_fkey" FOREIGN KEY ("quoteVersionId") REFERENCES "QuoteVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientPayment" ADD CONSTRAINT "ClientPayment_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "FinancialAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientPayment" ADD CONSTRAINT "ClientPayment_treasuryTransactionId_fkey" FOREIGN KEY ("treasuryTransactionId") REFERENCES "TreasuryTransaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientPayment" ADD CONSTRAINT "ClientPayment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientPayment" ADD CONSTRAINT "ClientPayment_voidedById_fkey" FOREIGN KEY ("voidedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountTransfer" ADD CONSTRAINT "AccountTransfer_fromAccountId_fkey" FOREIGN KEY ("fromAccountId") REFERENCES "FinancialAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountTransfer" ADD CONSTRAINT "AccountTransfer_toAccountId_fkey" FOREIGN KEY ("toAccountId") REFERENCES "FinancialAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountTransfer" ADD CONSTRAINT "AccountTransfer_outTransactionId_fkey" FOREIGN KEY ("outTransactionId") REFERENCES "TreasuryTransaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountTransfer" ADD CONSTRAINT "AccountTransfer_inTransactionId_fkey" FOREIGN KEY ("inTransactionId") REFERENCES "TreasuryTransaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountTransfer" ADD CONSTRAINT "AccountTransfer_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountTransfer" ADD CONSTRAINT "AccountTransfer_voidedById_fkey" FOREIGN KEY ("voidedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffReimbursement" ADD CONSTRAINT "StaffReimbursement_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffReimbursement" ADD CONSTRAINT "StaffReimbursement_eventExpenseId_fkey" FOREIGN KEY ("eventExpenseId") REFERENCES "EventExpense"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffReimbursement" ADD CONSTRAINT "StaffReimbursement_generalExpenseId_fkey" FOREIGN KEY ("generalExpenseId") REFERENCES "GeneralExpense"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffReimbursement" ADD CONSTRAINT "StaffReimbursement_paymentAccountId_fkey" FOREIGN KEY ("paymentAccountId") REFERENCES "FinancialAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffReimbursement" ADD CONSTRAINT "StaffReimbursement_treasuryTransactionId_fkey" FOREIGN KEY ("treasuryTransactionId") REFERENCES "TreasuryTransaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffReimbursement" ADD CONSTRAINT "StaffReimbursement_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffReimbursement" ADD CONSTRAINT "StaffReimbursement_paidById_fkey" FOREIGN KEY ("paidById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffReimbursement" ADD CONSTRAINT "StaffReimbursement_voidedById_fkey" FOREIGN KEY ("voidedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneralExpense" ADD CONSTRAINT "GeneralExpense_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ExpenseCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneralExpense" ADD CONSTRAINT "GeneralExpense_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "FinancialAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneralExpense" ADD CONSTRAINT "GeneralExpense_paidByStaffId_fkey" FOREIGN KEY ("paidByStaffId") REFERENCES "Staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneralExpense" ADD CONSTRAINT "GeneralExpense_treasuryTransactionId_fkey" FOREIGN KEY ("treasuryTransactionId") REFERENCES "TreasuryTransaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneralExpense" ADD CONSTRAINT "GeneralExpense_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneralExpense" ADD CONSTRAINT "GeneralExpense_voidedById_fkey" FOREIGN KEY ("voidedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OwnerWithdrawal" ADD CONSTRAINT "OwnerWithdrawal_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OwnerWithdrawal" ADD CONSTRAINT "OwnerWithdrawal_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "FinancialAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OwnerWithdrawal" ADD CONSTRAINT "OwnerWithdrawal_treasuryTransactionId_fkey" FOREIGN KEY ("treasuryTransactionId") REFERENCES "TreasuryTransaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OwnerWithdrawal" ADD CONSTRAINT "OwnerWithdrawal_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OwnerWithdrawal" ADD CONSTRAINT "OwnerWithdrawal_voidedById_fkey" FOREIGN KEY ("voidedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OwnerContribution" ADD CONSTRAINT "OwnerContribution_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "FinancialAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OwnerContribution" ADD CONSTRAINT "OwnerContribution_treasuryTransactionId_fkey" FOREIGN KEY ("treasuryTransactionId") REFERENCES "TreasuryTransaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OwnerContribution" ADD CONSTRAINT "OwnerContribution_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OwnerContribution" ADD CONSTRAINT "OwnerContribution_voidedById_fkey" FOREIGN KEY ("voidedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialSetting" ADD CONSTRAINT "FinancialSetting_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
