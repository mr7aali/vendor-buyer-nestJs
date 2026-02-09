-- AlterTable
ALTER TABLE "Buyer" ALTER COLUMN "fullName" SET DEFAULT '';

-- AlterTable
ALTER TABLE "Order" ALTER COLUMN "orderNumber" SET DEFAULT 'ORD-' || upper(substr(md5(random()::text), 1, 4));

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "adminCommissionAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "vendorPayoutAmount" DECIMAL(10,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Vendor" ALTER COLUMN "vendorCode" SET DEFAULT 'VEN-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8)),
ALTER COLUMN "fullName" SET DEFAULT '';
