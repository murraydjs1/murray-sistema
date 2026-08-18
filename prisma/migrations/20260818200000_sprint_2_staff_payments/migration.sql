-- Sprint 2: personal, asignaciones y pagos
CREATE TYPE "StaffRole" AS ENUM ('DJ', 'TECNICO', 'DJ_TECNICO');
CREATE TYPE "AssignmentType" AS ENUM ('DJ', 'ARMADO', 'DESARMADO', 'TECNICO', 'DJ_TECNICO', 'OTRO');
CREATE TYPE "PaymentType" AS ENUM ('ADVANCE', 'PARTIAL', 'FINAL');
CREATE TYPE "PaymentMethod" AS ENUM ('TRANSFER', 'CASH', 'OTHER');
CREATE TYPE "PaymentStatus" AS ENUM ('ACTIVE', 'VOID');

CREATE TABLE "Staff" (
  "id" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "phone" TEXT,
  "email" TEXT,
  "defaultRole" "StaffRole" NOT NULL,
  "defaultEventRate" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "currency" "Currency" NOT NULL DEFAULT 'ARS',
  "active" BOOLEAN NOT NULL DEFAULT true,
  "userId" UUID,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Staff_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Event" ADD COLUMN "managerStaffId" UUID;

CREATE TABLE "EventStaff" (
  "id" UUID NOT NULL,
  "eventId" UUID NOT NULL,
  "staffId" UUID NOT NULL,
  "assignmentType" "AssignmentType" NOT NULL,
  "agreedAmount" DECIMAL(18,2) NOT NULL,
  "currency" "Currency" NOT NULL,
  "notes" TEXT,
  "createdById" UUID NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "voidedAt" TIMESTAMP(3),
  "voidReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "EventStaff_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "StaffPayment" (
  "id" UUID NOT NULL,
  "staffId" UUID NOT NULL,
  "eventId" UUID,
  "amount" DECIMAL(18,2) NOT NULL,
  "currency" "Currency" NOT NULL,
  "paymentDate" DATE NOT NULL,
  "paymentMethod" "PaymentMethod" NOT NULL,
  "paymentType" "PaymentType" NOT NULL,
  "status" "PaymentStatus" NOT NULL DEFAULT 'ACTIVE',
  "notes" TEXT,
  "createdById" UUID NOT NULL,
  "voidedAt" TIMESTAMP(3),
  "voidedById" UUID,
  "voidReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StaffPayment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Staff_userId_key" ON "Staff"("userId");
CREATE INDEX "Staff_active_name_idx" ON "Staff"("active", "name");
CREATE INDEX "Event_managerStaffId_idx" ON "Event"("managerStaffId");
CREATE UNIQUE INDEX "EventStaff_eventId_staffId_assignmentType_key" ON "EventStaff"("eventId", "staffId", "assignmentType");
CREATE INDEX "EventStaff_staffId_active_idx" ON "EventStaff"("staffId", "active");
CREATE INDEX "EventStaff_eventId_active_idx" ON "EventStaff"("eventId", "active");
CREATE INDEX "StaffPayment_staffId_paymentDate_idx" ON "StaffPayment"("staffId", "paymentDate");
CREATE INDEX "StaffPayment_eventId_idx" ON "StaffPayment"("eventId");
CREATE INDEX "StaffPayment_status_currency_idx" ON "StaffPayment"("status", "currency");

ALTER TABLE "Staff" ADD CONSTRAINT "Staff_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Event" ADD CONSTRAINT "Event_managerStaffId_fkey" FOREIGN KEY ("managerStaffId") REFERENCES "Staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "EventStaff" ADD CONSTRAINT "EventStaff_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "EventStaff" ADD CONSTRAINT "EventStaff_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "EventStaff" ADD CONSTRAINT "EventStaff_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StaffPayment" ADD CONSTRAINT "StaffPayment_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StaffPayment" ADD CONSTRAINT "StaffPayment_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StaffPayment" ADD CONSTRAINT "StaffPayment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StaffPayment" ADD CONSTRAINT "StaffPayment_voidedById_fkey" FOREIGN KEY ("voidedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
