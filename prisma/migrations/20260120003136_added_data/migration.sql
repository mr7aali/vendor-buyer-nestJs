/*
  Warnings:

  - You are about to drop the column `email` on the `Buyer` table. All the data in the column will be lost.
  - You are about to drop the column `email` on the `Vendor` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "Buyer_email_key";

-- DropIndex
DROP INDEX "Vendor_email_key";

-- AlterTable
ALTER TABLE "Buyer" DROP COLUMN "email";

-- AlterTable
ALTER TABLE "Vendor" DROP COLUMN "email";
