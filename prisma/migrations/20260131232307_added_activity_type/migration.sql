-- CreateEnum
CREATE TYPE "ActivityType" AS ENUM ('ORDER_CREATED', 'ORDER_DELIVERED', 'ORDER_CREATE_FAILED', 'VENDOR_KYC_SUBMITTED', 'USER_REGISTERED', 'PAYMENT_RECEIVED');

-- CreateEnum
CREATE TYPE "ActorType" AS ENUM ('USER', 'VENDOR', 'ADMIN', 'SYSTEM');

-- AlterTable
ALTER TABLE "Vendor" ALTER COLUMN "vendorCode" SET DEFAULT 'VEN-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8));

-- CreateTable
CREATE TABLE "ActivityLog" (
    "id" TEXT NOT NULL,
    "type" "ActivityType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "entity" TEXT,
    "entityId" TEXT,
    "actorType" "ActorType",
    "actorName" TEXT,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityLog_pkey" PRIMARY KEY ("id")
);
