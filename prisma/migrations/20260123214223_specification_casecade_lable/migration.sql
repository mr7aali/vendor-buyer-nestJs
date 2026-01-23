/*
  Warnings:

  - Added the required column `label` to the `Specification` table without a default value. This is not possible if the table is not empty.
  - Added the required column `value` to the `Specification` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Specification" ADD COLUMN     "label" TEXT NOT NULL,
ADD COLUMN     "value" TEXT NOT NULL;
