/*
  Warnings:

  - A unique constraint covering the columns `[code]` on the table `Coupon` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Coupon" ALTER COLUMN "code" SET DEFAULT upper(substr(md5(random()::text), 1, 6)),
ALTER COLUMN "validFrom" SET DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "usageLimit" SET DEFAULT 1;

-- AlterTable
ALTER TABLE "Order" ALTER COLUMN "orderNumber" SET DEFAULT 'ORD-' || upper(substr(md5(random()::text), 1, 4));

-- AlterTable
ALTER TABLE "Vendor" ALTER COLUMN "vendorCode" SET DEFAULT 'VEN-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8));

-- CreateIndex
CREATE UNIQUE INDEX "Coupon_code_key" ON "Coupon"("code");
