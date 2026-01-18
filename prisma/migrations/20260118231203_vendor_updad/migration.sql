/*
  Warnings:

  - You are about to drop the column `businessAddress` on the `Vendor` table. All the data in the column will be lost.
  - Added the required column `address` to the `Vendor` table without a default value. This is not possible if the table is not empty.
  - Added the required column `bussinessIdPhotoUrl` to the `Vendor` table without a default value. This is not possible if the table is not empty.
  - Added the required column `bussinessRegNumber` to the `Vendor` table without a default value. This is not possible if the table is not empty.
  - Added the required column `nationalIdNumber` to the `Vendor` table without a default value. This is not possible if the table is not empty.
  - Added the required column `nidBackPhotoUrl` to the `Vendor` table without a default value. This is not possible if the table is not empty.
  - Added the required column `nidFontPhotoUrl` to the `Vendor` table without a default value. This is not possible if the table is not empty.
  - Added the required column `storeDescription` to the `Vendor` table without a default value. This is not possible if the table is not empty.
  - Added the required column `storename` to the `Vendor` table without a default value. This is not possible if the table is not empty.
  - Made the column `logoUrl` on table `Vendor` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Vendor" DROP COLUMN "businessAddress",
ADD COLUMN     "address" TEXT NOT NULL,
ADD COLUMN     "bussinessIdPhotoUrl" TEXT NOT NULL,
ADD COLUMN     "bussinessRegNumber" TEXT NOT NULL,
ADD COLUMN     "nationalIdNumber" TEXT NOT NULL,
ADD COLUMN     "nidBackPhotoUrl" TEXT NOT NULL,
ADD COLUMN     "nidFontPhotoUrl" TEXT NOT NULL,
ADD COLUMN     "storeDescription" TEXT NOT NULL,
ADD COLUMN     "storename" TEXT NOT NULL,
ALTER COLUMN "logoUrl" SET NOT NULL;
