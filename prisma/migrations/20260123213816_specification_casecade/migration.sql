-- DropForeignKey
ALTER TABLE "Specification" DROP CONSTRAINT "Specification_productId_fkey";

-- AddForeignKey
ALTER TABLE "Specification" ADD CONSTRAINT "Specification_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
