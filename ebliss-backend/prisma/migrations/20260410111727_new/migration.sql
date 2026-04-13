-- AlterTable
ALTER TABLE "vm_plans" ADD COLUMN     "hourly_price" DECIMAL(10,4),
ADD COLUMN     "monthly_price" DECIMAL(10,2),
ADD COLUMN     "type" "PlanType" NOT NULL DEFAULT 'hourly';
