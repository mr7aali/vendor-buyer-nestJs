-- Add Stripe Connect fields to Vendor
ALTER TABLE "Vendor"
ADD COLUMN "stripeAccountId" TEXT,
ADD COLUMN "stripeAccountStatus" TEXT,
ADD COLUMN "stripeChargesEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "stripePayoutsEnabled" BOOLEAN NOT NULL DEFAULT false;

CREATE UNIQUE INDEX "Vendor_stripeAccountId_key" ON "Vendor"("stripeAccountId");

-- Add commission tracking fields to Payment
ALTER TABLE "Payment"
ADD COLUMN "adminCommissionAmount" DECIMAL(10, 2) NOT NULL DEFAULT 0,
ADD COLUMN "vendorPayoutAmount" DECIMAL(10, 2) NOT NULL DEFAULT 0;
