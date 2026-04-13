/*
  Warnings:

  - The primary key for the `vm_plans` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `vm_plans` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `plan_id` column on the `vms` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- DropForeignKey
ALTER TABLE "vms" DROP CONSTRAINT "vms_plan_id_fkey";

-- AlterTable
ALTER TABLE "vm_plans" DROP CONSTRAINT "vm_plans_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
ADD CONSTRAINT "vm_plans_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "vms" DROP COLUMN "plan_id",
ADD COLUMN     "plan_id" INTEGER;

-- AddForeignKey
ALTER TABLE "vms" ADD CONSTRAINT "vms_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "vm_plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;
