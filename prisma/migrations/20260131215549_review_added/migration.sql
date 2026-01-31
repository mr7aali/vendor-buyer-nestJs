-- AlterTable
ALTER TABLE "Vendor" ALTER COLUMN "vendorCode" SET DEFAULT 'VEN-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8));

-- CreateTable
CREATE TABLE "product_review" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "orderId" TEXT,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "isVerifiedPurchase" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendor_review" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "orderId" TEXT,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "isVerifiedPurchase" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vendor_review_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "product_review_productId_idx" ON "product_review"("productId");

-- CreateIndex
CREATE INDEX "product_review_buyerId_idx" ON "product_review"("buyerId");

-- CreateIndex
CREATE INDEX "product_review_rating_idx" ON "product_review"("rating");

-- CreateIndex
CREATE UNIQUE INDEX "product_review_productId_buyerId_orderId_key" ON "product_review"("productId", "buyerId", "orderId");

-- CreateIndex
CREATE INDEX "vendor_review_vendorId_idx" ON "vendor_review"("vendorId");

-- CreateIndex
CREATE INDEX "vendor_review_buyerId_idx" ON "vendor_review"("buyerId");

-- CreateIndex
CREATE INDEX "vendor_review_rating_idx" ON "vendor_review"("rating");

-- CreateIndex
CREATE UNIQUE INDEX "vendor_review_vendorId_buyerId_orderId_key" ON "vendor_review"("vendorId", "buyerId", "orderId");

-- AddForeignKey
ALTER TABLE "product_review" ADD CONSTRAINT "product_review_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_review" ADD CONSTRAINT "product_review_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "Buyer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_review" ADD CONSTRAINT "product_review_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_review" ADD CONSTRAINT "vendor_review_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_review" ADD CONSTRAINT "vendor_review_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "Buyer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_review" ADD CONSTRAINT "vendor_review_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;
