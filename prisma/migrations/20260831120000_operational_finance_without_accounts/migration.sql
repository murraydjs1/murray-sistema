-- Los cobros se pueden registrar como dato operativo aunque no se lleven cuentas bancarias en el sistema.
ALTER TABLE "ClientPayment" ALTER COLUMN "accountId" DROP NOT NULL;
ALTER TABLE "ClientPayment" ALTER COLUMN "treasuryTransactionId" DROP NOT NULL;
