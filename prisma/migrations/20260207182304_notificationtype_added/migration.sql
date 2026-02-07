-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('info', 'success', 'warning', 'error');

-- CreateEnum
CREATE TYPE "NotificationCategory" AS ENUM ('system', 'buyer', 'vendor', 'broadcast');

-- AlterTable
ALTER TABLE "Notification" ADD COLUMN     "category" "NotificationCategory" NOT NULL DEFAULT 'system',
ADD COLUMN     "type" "NotificationType" NOT NULL DEFAULT 'info';

-- AlterTable
ALTER TABLE "Order" ALTER COLUMN "orderNumber" SET DEFAULT 'ORD-' || upper(substr(md5(random()::text), 1, 4));

-- AlterTable
ALTER TABLE "Vendor" ALTER COLUMN "vendorCode" SET DEFAULT 'VEN-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8));
