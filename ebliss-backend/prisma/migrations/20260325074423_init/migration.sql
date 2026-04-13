/*
  Warnings:

  - The `status` column on the `invoices` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `status` column on the `ip_addresses` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `api_token` on the `nodes` table. All the data in the column will be lost.
  - The `status` column on the `nodes` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `userId` on the `notification_logs` table. All the data in the column will be lost.
  - The `status` column on the `payments` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `price` on the `plans` table. All the data in the column will be lost.
  - The `plan_type` column on the `vms` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `status` column on the `vms` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to alter the column `hourly_rate` on the `vms` table. The data in that column could be lost. The data in that column will be cast from `Decimal(10,2)` to `Decimal(10,4)`.
  - A unique constraint covering the columns `[invoice_number]` on the table `invoices` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `invoice_number` to the `invoices` table without a default value. This is not possible if the table is not empty.
  - Added the required column `subtotal` to the `invoices` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tax_amount` to the `invoices` table without a default value. This is not possible if the table is not empty.
  - Added the required column `api_token_id` to the `nodes` table without a default value. This is not possible if the table is not empty.
  - Added the required column `api_token_secret` to the `nodes` table without a default value. This is not possible if the table is not empty.
  - Added the required column `max_storage_gb` to the `nodes` table without a default value. This is not possible if the table is not empty.
  - Added the required column `hostname` to the `vms` table without a default value. This is not possible if the table is not empty.
  - Added the required column `name` to the `vms` table without a default value. This is not possible if the table is not empty.
  - Added the required column `plan_id` to the `vms` table without a default value. This is not possible if the table is not empty.
  - Added the required column `ram_gb` to the `vms` table without a default value. This is not possible if the table is not empty.
  - Added the required column `ssd_gb` to the `vms` table without a default value. This is not possible if the table is not empty.
  - Added the required column `vcpu` to the `vms` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "VMStatus" AS ENUM ('pending', 'creating', 'running', 'stopped', 'suspended', 'rebooting', 'rebuilding', 'deleting', 'deleted', 'failed');

-- CreateEnum
CREATE TYPE "NodeStatus" AS ENUM ('active', 'maintenance', 'offline');

-- CreateEnum
CREATE TYPE "IPStatus" AS ENUM ('available', 'assigned', 'reserved', 'released');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('pending', 'paid', 'overdue', 'voided');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('pending', 'completed', 'failed', 'refunded');

-- DropForeignKey
ALTER TABLE "notification_logs" DROP CONSTRAINT "notification_logs_userId_fkey";

-- AlterTable
ALTER TABLE "colocations" ADD COLUMN     "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "coupons" ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "dedicated_servers" ADD COLUMN     "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "firewall_groups" ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "invoices" ADD COLUMN     "billing_period_end" TIMESTAMP(3),
ADD COLUMN     "billing_period_start" TIMESTAMP(3),
ADD COLUMN     "invoice_number" TEXT NOT NULL,
ADD COLUMN     "paid_at" TIMESTAMP(3),
ADD COLUMN     "subtotal" DECIMAL(10,2) NOT NULL,
ADD COLUMN     "tax_amount" DECIMAL(10,2) NOT NULL,
ADD COLUMN     "tax_rate" DOUBLE PRECISION,
DROP COLUMN "status",
ADD COLUMN     "status" "InvoiceStatus" NOT NULL DEFAULT 'pending';

-- AlterTable
ALTER TABLE "ip_addresses" ADD COLUMN     "assigned_at" TIMESTAMP(3),
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "gateway" TEXT,
ADD COLUMN     "released_at" TIMESTAMP(3),
DROP COLUMN "status",
ADD COLUMN     "status" "IPStatus" NOT NULL DEFAULT 'available';

-- AlterTable
ALTER TABLE "nodes" DROP COLUMN "api_token",
ADD COLUMN     "api_token_id" TEXT NOT NULL,
ADD COLUMN     "api_token_secret" TEXT NOT NULL,
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "max_storage_gb" INTEGER NOT NULL,
DROP COLUMN "status",
ADD COLUMN     "status" "NodeStatus" NOT NULL DEFAULT 'active';

-- AlterTable
ALTER TABLE "notification_logs" DROP COLUMN "userId",
ADD COLUMN     "user_id" INTEGER;

-- AlterTable
ALTER TABLE "payments" DROP COLUMN "status",
ADD COLUMN     "status" "PaymentStatus" NOT NULL DEFAULT 'pending';

-- AlterTable
ALTER TABLE "plans" DROP COLUMN "price",
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "hourly_price" DECIMAL(10,4),
ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "monthly_price" DECIMAL(10,2);

-- AlterTable
ALTER TABLE "pops" ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "vms" ADD COLUMN     "cloud_init_data" JSONB,
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "firewall_group_id" INTEGER,
ADD COLUMN     "hostname" TEXT NOT NULL,
ADD COLUMN     "last_billed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "monthly_rate" DECIMAL(10,2),
ADD COLUMN     "name" TEXT NOT NULL,
ADD COLUMN     "plan_id" INTEGER NOT NULL,
ADD COLUMN     "ram_gb" INTEGER NOT NULL,
ADD COLUMN     "ssd_gb" INTEGER NOT NULL,
ADD COLUMN     "ssh_key_ids" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
ADD COLUMN     "suspended_at" TIMESTAMP(3),
ADD COLUMN     "terminated_at" TIMESTAMP(3),
ADD COLUMN     "vcpu" INTEGER NOT NULL,
DROP COLUMN "plan_type",
ADD COLUMN     "plan_type" "PlanType" NOT NULL DEFAULT 'hourly',
DROP COLUMN "status",
ADD COLUMN     "status" "VMStatus" NOT NULL DEFAULT 'pending',
ALTER COLUMN "hourly_rate" SET DATA TYPE DECIMAL(10,4);

-- CreateTable
CREATE TABLE "vm_snapshots" (
    "id" SERIAL NOT NULL,
    "vm_id" INTEGER NOT NULL,
    "proxmox_snapshot_name" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "size_gb" DOUBLE PRECISION,
    "userId" INTEGER NOT NULL,

    CONSTRAINT "vm_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vm_metrics" (
    "id" SERIAL NOT NULL,
    "vm_id" INTEGER NOT NULL,
    "cpu_usage" DOUBLE PRECISION NOT NULL,
    "memory_usage" DOUBLE PRECISION NOT NULL,
    "disk_usage" DOUBLE PRECISION NOT NULL,
    "bandwidth_in_mb" DOUBLE PRECISION NOT NULL,
    "bandwidth_out_mb" DOUBLE PRECISION NOT NULL,
    "recorded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vm_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "os_templates" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "os_type" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "proxmox_template_id" TEXT NOT NULL,
    "min_ram_gb" INTEGER NOT NULL DEFAULT 1,
    "min_disk_gb" INTEGER NOT NULL DEFAULT 10,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "os_templates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "vm_metrics_vm_id_recorded_at_key" ON "vm_metrics"("vm_id", "recorded_at");

-- CreateIndex
CREATE UNIQUE INDEX "os_templates_slug_key" ON "os_templates"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_invoice_number_key" ON "invoices"("invoice_number");

-- AddForeignKey
ALTER TABLE "vms" ADD CONSTRAINT "vms_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vms" ADD CONSTRAINT "vms_firewall_group_id_fkey" FOREIGN KEY ("firewall_group_id") REFERENCES "firewall_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vm_snapshots" ADD CONSTRAINT "vm_snapshots_vm_id_fkey" FOREIGN KEY ("vm_id") REFERENCES "vms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vm_snapshots" ADD CONSTRAINT "vm_snapshots_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vm_metrics" ADD CONSTRAINT "vm_metrics_vm_id_fkey" FOREIGN KEY ("vm_id") REFERENCES "vms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_logs" ADD CONSTRAINT "notification_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
