-- DropForeignKey
ALTER TABLE "vms" DROP CONSTRAINT "vms_plan_id_fkey";

-- AlterTable
ALTER TABLE "vms" ALTER COLUMN "plan_id" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "vms" ADD CONSTRAINT "vms_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "vm_plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;
