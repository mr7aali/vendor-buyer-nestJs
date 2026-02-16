/*
  Warnings:

  - Made the column `country` on table `Order` required. This step will fail if there are existing NULL values in that column.
  - Made the column `optionalAddress` on table `Order` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Coupon" ALTER COLUMN "code" SET DEFAULT upper(substr(md5(random()::text), 1, 6));

-- AlterTable
ALTER TABLE "Order" ALTER COLUMN "orderNumber" SET DEFAULT 'ORD-' || upper(substr(md5(random()::text), 1, 4)),
ALTER COLUMN "country" SET NOT NULL,
ALTER COLUMN "country" DROP DEFAULT,
ALTER COLUMN "optionalAddress" SET NOT NULL,
ALTER COLUMN "optionalAddress" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Vendor" ALTER COLUMN "vendorCode" SET DEFAULT 'VEN-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8));
