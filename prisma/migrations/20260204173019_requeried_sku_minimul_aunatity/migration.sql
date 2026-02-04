-- AlterTable
ALTER TABLE "Order" ALTER COLUMN "orderNumber" SET DEFAULT 'VEN-' || upper(substr(md5(random()::text), 1, 4));

-- AlterTable
ALTER TABLE "Product" ALTER COLUMN "minimulAuantity" DROP DEFAULT,
ALTER COLUMN "sku" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Vendor" ALTER COLUMN "vendorCode" SET DEFAULT 'VEN-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8));
