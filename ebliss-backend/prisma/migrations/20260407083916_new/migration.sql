/*
  Warnings:

  - You are about to alter the column `amount` on the `transactions` table. The data in that column could be lost. The data in that column will be cast from `Decimal(10,2)` to `Decimal(10,4)`.
  - Changed the type of `type` on the `transactions` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "transactions"
ADD COLUMN "metadata" JSONB,
ADD COLUMN "status" TEXT,
ADD COLUMN "updated_at" TIMESTAMP(3),
DROP COLUMN "type",
ADD COLUMN "type" TEXT NOT NULL,
ALTER COLUMN "amount" SET DATA TYPE DECIMAL(10,4);