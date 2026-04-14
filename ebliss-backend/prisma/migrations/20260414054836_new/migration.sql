/*
  Warnings:

  - You are about to drop the column `planId` on the `vms` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "vms" DROP CONSTRAINT "vms_planId_fkey";

-- DropForeignKey
ALTER TABLE "vms" DROP CONSTRAINT "vms_plan_id_fkey";

-- AlterTable
ALTER TABLE "vms" DROP COLUMN "planId";

-- AddForeignKey
ALTER TABLE "vms" ADD CONSTRAINT "vms_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;
