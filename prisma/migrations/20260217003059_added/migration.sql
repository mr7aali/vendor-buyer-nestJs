-- AlterTable
ALTER TABLE "Buyer" ADD COLUMN     "country" TEXT DEFAULT '';

-- AlterTable
ALTER TABLE "Coupon" ALTER COLUMN "code" SET DEFAULT upper(substr(md5(random()::text), 1, 6));

-- AlterTable
ALTER TABLE "Order" ALTER COLUMN "orderNumber" SET DEFAULT 'ORD-' || upper(substr(md5(random()::text), 1, 4));

-- AlterTable
ALTER TABLE "Vendor" ADD COLUMN     "country" TEXT DEFAULT '',
ALTER COLUMN "vendorCode" SET DEFAULT 'VEN-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8));
