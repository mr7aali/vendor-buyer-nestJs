-- CreateEnum
CREATE TYPE "AdminChatSenderType" AS ENUM ('ADMIN', 'BUYER', 'VENDOR');

-- AlterTable
ALTER TABLE "Order" ALTER COLUMN "orderNumber" SET DEFAULT 'ORD-' || upper(substr(md5(random()::text), 1, 4));

-- AlterTable
ALTER TABLE "Vendor" ALTER COLUMN "vendorCode" SET DEFAULT 'VEN-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8));

-- CreateTable
CREATE TABLE "AdminChatThread" (
    "id" TEXT NOT NULL,
    "buyerId" TEXT,
    "vendorId" TEXT,
    "assignedAdminId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminChatThread_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminChatMessage" (
    "id" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "senderType" TEXT NOT NULL,
    "senderAdminId" INTEGER,
    "senderBuyerId" TEXT,
    "senderVendorId" TEXT,
    "messageText" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AdminChatThread_buyerId_idx" ON "AdminChatThread"("buyerId");

-- CreateIndex
CREATE INDEX "AdminChatThread_vendorId_idx" ON "AdminChatThread"("vendorId");

-- CreateIndex
CREATE INDEX "AdminChatThread_assignedAdminId_idx" ON "AdminChatThread"("assignedAdminId");

-- CreateIndex
CREATE UNIQUE INDEX "AdminChatThread_buyerId_key" ON "AdminChatThread"("buyerId");

-- CreateIndex
CREATE UNIQUE INDEX "AdminChatThread_vendorId_key" ON "AdminChatThread"("vendorId");

-- CreateIndex
CREATE INDEX "AdminChatMessage_threadId_idx" ON "AdminChatMessage"("threadId");

-- CreateIndex
CREATE INDEX "AdminChatMessage_senderType_idx" ON "AdminChatMessage"("senderType");

-- CreateIndex
CREATE INDEX "AdminChatMessage_createdAt_idx" ON "AdminChatMessage"("createdAt");

-- AddForeignKey
ALTER TABLE "AdminChatThread" ADD CONSTRAINT "AdminChatThread_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "Buyer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminChatThread" ADD CONSTRAINT "AdminChatThread_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminChatThread" ADD CONSTRAINT "AdminChatThread_assignedAdminId_fkey" FOREIGN KEY ("assignedAdminId") REFERENCES "Admin"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminChatMessage" ADD CONSTRAINT "AdminChatMessage_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "AdminChatThread"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminChatMessage" ADD CONSTRAINT "AdminChatMessage_senderAdminId_fkey" FOREIGN KEY ("senderAdminId") REFERENCES "Admin"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminChatMessage" ADD CONSTRAINT "AdminChatMessage_senderBuyerId_fkey" FOREIGN KEY ("senderBuyerId") REFERENCES "Buyer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminChatMessage" ADD CONSTRAINT "AdminChatMessage_senderVendorId_fkey" FOREIGN KEY ("senderVendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
