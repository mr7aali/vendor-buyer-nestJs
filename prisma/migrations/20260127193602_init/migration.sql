-- CreateEnum
CREATE TYPE "AdminRole" AS ENUM ('SUPER_ADMIN', 'EMPLOYEE');

-- AlterTable
ALTER TABLE "Payment"
ADD COLUMN "cardBrand" TEXT,
ADD COLUMN "expiresAt" TIMESTAMP(3),
ADD COLUMN "lastFourDigits" TEXT,
ADD COLUMN "paymentMethod" TEXT;

-- AlterTable
ALTER TABLE "Vendor" ALTER COLUMN "vendorCode" SET DEFAULT 'VEN-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8));

-- CreateTable
CREATE TABLE "Admin" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "AdminRole" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Admin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Permission" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "description" TEXT,
    CONSTRAINT "Permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminPermission" (
    "adminId" INTEGER NOT NULL,
    "permissionId" INTEGER NOT NULL,
    CONSTRAINT "AdminPermission_pkey" PRIMARY KEY ("adminId", "permissionId")
);

-- CreateIndex
CREATE UNIQUE INDEX "Admin_email_key" ON "Admin" ("email");

-- CreateIndex
CREATE UNIQUE INDEX "Permission_key_key" ON "Permission" ("key");

-- AddForeignKey
ALTER TABLE "AdminPermission"
ADD CONSTRAINT "AdminPermission_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "Admin" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminPermission"
ADD CONSTRAINT "AdminPermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "Permission" ("id") ON DELETE CASCADE ON UPDATE CASCADE;