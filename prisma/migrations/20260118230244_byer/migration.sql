/*
  Warnings:

  - You are about to drop the column `vendorCode` on the `Buyer` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[email]` on the table `Buyer` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `nidNumber` to the `Buyer` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Buyer_vendorCode_key";

-- AlterTable
ALTER TABLE "Buyer" DROP COLUMN "vendorCode",
ADD COLUMN     "nidNumber" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Buyer_email_key" ON "Buyer"("email");
