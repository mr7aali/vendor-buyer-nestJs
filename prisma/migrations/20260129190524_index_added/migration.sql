/*
  Warnings:

  - A unique constraint covering the columns `[index]` on the table `user` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Vendor" ALTER COLUMN "vendorCode" SET DEFAULT 'VEN-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8));

-- AlterTable
ALTER TABLE "user" ADD COLUMN     "index" SERIAL NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "user_index_key" ON "user"("index");
