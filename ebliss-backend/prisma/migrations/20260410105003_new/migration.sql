/*
  Warnings:

  - The primary key for the `colocations` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `assigned_at` on the `colocations` table. All the data in the column will be lost.
  - You are about to drop the column `bandwidth_gbps` on the `colocations` table. All the data in the column will be lost.
  - You are about to drop the column `power_w` on the `colocations` table. All the data in the column will be lost.
  - You are about to drop the column `rack` on the `colocations` table. All the data in the column will be lost.
  - You are about to drop the column `unit` on the `colocations` table. All the data in the column will be lost.
  - The `status` column on the `colocations` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `dedicated_servers` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `assigned_at` on the `dedicated_servers` table. All the data in the column will be lost.
  - You are about to drop the column `ips_json` on the `dedicated_servers` table. All the data in the column will be lost.
  - You are about to drop the column `label` on the `dedicated_servers` table. All the data in the column will be lost.
  - You are about to drop the column `specs_json` on the `dedicated_servers` table. All the data in the column will be lost.
  - The `status` column on the `dedicated_servers` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - A unique constraint covering the columns `[datacenter,rack_id,unit_position]` on the table `colocations` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[hostname]` on the table `dedicated_servers` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[datacenter,rack_id,rack_position]` on the table `dedicated_servers` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `datacenter` to the `colocations` table without a default value. This is not possible if the table is not empty.
  - Added the required column `monthly_price` to the `colocations` table without a default value. This is not possible if the table is not empty.
  - Added the required column `rack_id` to the `colocations` table without a default value. This is not possible if the table is not empty.
  - Added the required column `unit_position` to the `colocations` table without a default value. This is not possible if the table is not empty.
  - Added the required column `unit_size` to the `colocations` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `colocations` table without a default value. This is not possible if the table is not empty.
  - Added the required column `cpu_cores` to the `dedicated_servers` table without a default value. This is not possible if the table is not empty.
  - Added the required column `cpu_model` to the `dedicated_servers` table without a default value. This is not possible if the table is not empty.
  - Added the required column `cpu_speed` to the `dedicated_servers` table without a default value. This is not possible if the table is not empty.
  - Added the required column `cpu_threads` to the `dedicated_servers` table without a default value. This is not possible if the table is not empty.
  - Added the required column `hostname` to the `dedicated_servers` table without a default value. This is not possible if the table is not empty.
  - Added the required column `monthly_price` to the `dedicated_servers` table without a default value. This is not possible if the table is not empty.
  - Added the required column `name` to the `dedicated_servers` table without a default value. This is not possible if the table is not empty.
  - Added the required column `ram_gb` to the `dedicated_servers` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `dedicated_servers` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "ServerStatus" AS ENUM ('pending', 'provisioning', 'online', 'offline', 'maintenance', 'suspended', 'terminated', 'error');

-- CreateEnum
CREATE TYPE "ProvisioningStatus" AS ENUM ('pending', 'hardware_testing', 'os_installing', 'network_configuring', 'completed', 'failed');

-- CreateEnum
CREATE TYPE "StorageType" AS ENUM ('nvme', 'ssd', 'hdd');

-- CreateEnum
CREATE TYPE "BillingCycle" AS ENUM ('monthly', 'quarterly', 'half_yearly', 'yearly');

-- CreateEnum
CREATE TYPE "ServerLogType" AS ENUM ('system', 'security', 'hardware', 'network', 'user_action', 'monitoring');

-- CreateEnum
CREATE TYPE "LogSeverity" AS ENUM ('debug', 'info', 'warning', 'error', 'critical');

-- CreateEnum
CREATE TYPE "MaintenanceStatus" AS ENUM ('scheduled', 'in_progress', 'completed', 'cancelled');

-- CreateEnum
CREATE TYPE "CabinetType" AS ENUM ('standard', 'high_density', 'secure');

-- CreateEnum
CREATE TYPE "ColocationStatus" AS ENUM ('pending', 'active', 'suspended', 'terminated', 'maintenance');

-- CreateEnum
CREATE TYPE "AccessLevel" AS ENUM ('full', 'restricted', 'supervised');

-- CreateEnum
CREATE TYPE "AccessType" AS ENUM ('entry', 'exit', 'denied', 'escort');

-- CreateEnum
CREATE TYPE "AccessMethod" AS ENUM ('biometric', 'keycard', 'pin', 'manual');

-- CreateEnum
CREATE TYPE "AccessStatus" AS ENUM ('success', 'failed', 'pending');

-- CreateEnum
CREATE TYPE "PowerFeedStatus" AS ENUM ('active', 'inactive', 'maintenance', 'failed');

-- CreateEnum
CREATE TYPE "RackStatus" AS ENUM ('operational', 'maintenance', 'offline', 'full');

-- CreateEnum
CREATE TYPE "DeviceType" AS ENUM ('server', 'switch', 'firewall', 'storage', 'pdu', 'router', 'other');

-- CreateEnum
CREATE TYPE "DeviceStatus" AS ENUM ('online', 'offline', 'maintenance', 'provisioning', 'error');

-- CreateEnum
CREATE TYPE "ProductCategoryType" AS ENUM ('laptop', 'server', 'desktop', 'accessory', 'software', 'network', 'storage');

-- CreateEnum
CREATE TYPE "StockStatus" AS ENUM ('in_stock', 'low_stock', 'out_of_stock', 'backorder', 'discontinued');

-- CreateEnum
CREATE TYPE "ProductStatus" AS ENUM ('draft', 'active', 'inactive', 'archived');

-- CreateEnum
CREATE TYPE "PlanCategory" AS ENUM ('starter', 'business', 'pro', 'enterprise', 'custom', 'gpu');

-- DropForeignKey
ALTER TABLE "colocations" DROP CONSTRAINT "colocations_user_id_fkey";

-- DropForeignKey
ALTER TABLE "dedicated_servers" DROP CONSTRAINT "dedicated_servers_user_id_fkey";

-- DropForeignKey
ALTER TABLE "vms" DROP CONSTRAINT "vms_plan_id_fkey";

-- AlterTable
ALTER TABLE "colocations" DROP CONSTRAINT "colocations_pkey",
DROP COLUMN "assigned_at",
DROP COLUMN "bandwidth_gbps",
DROP COLUMN "power_w",
DROP COLUMN "rack",
DROP COLUMN "unit",
ADD COLUMN     "access_level" "AccessLevel" NOT NULL DEFAULT 'full',
ADD COLUMN     "asn" INTEGER,
ADD COLUMN     "auto_renew" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "bandwidth_mbps" INTEGER NOT NULL DEFAULT 1000,
ADD COLUMN     "bandwidth_used_mbps" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "biometric_access" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "cabinet_type" "CabinetType" NOT NULL DEFAULT 'standard',
ADD COLUMN     "contract_end" TIMESTAMP(3),
ADD COLUMN     "contract_start" TIMESTAMP(3),
ADD COLUMN     "cooling_type" TEXT,
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "cross_connect_fee" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "cross_connects" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "datacenter" TEXT NOT NULL,
ADD COLUMN     "humidity_percent" DOUBLE PRECISION,
ADD COLUMN     "ipv4_allocation" TEXT,
ADD COLUMN     "ipv6_allocation" TEXT,
ADD COLUMN     "last_inspection" TIMESTAMP(3),
ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "monthly_price" DECIMAL(10,2) NOT NULL,
ADD COLUMN     "network_port" TEXT NOT NULL DEFAULT '1 Gbps',
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "power_capacity_kw" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
ADD COLUMN     "power_cost_per_kwh" DECIMAL(10,4) NOT NULL DEFAULT 0,
ADD COLUMN     "power_used_kw" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "rack_id" TEXT NOT NULL,
ADD COLUMN     "rack_name" TEXT,
ADD COLUMN     "security_camera" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "setup_fee" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "sla_credit_percent" DOUBLE PRECISION NOT NULL DEFAULT 5,
ADD COLUMN     "sla_uptime_guarantee" DOUBLE PRECISION NOT NULL DEFAULT 99.9,
ADD COLUMN     "tags" TEXT[],
ADD COLUMN     "temperature_c" DOUBLE PRECISION,
ADD COLUMN     "unit_position" TEXT NOT NULL,
ADD COLUMN     "unit_size" INTEGER NOT NULL,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "user_id" DROP NOT NULL,
DROP COLUMN "status",
ADD COLUMN     "status" "ColocationStatus" NOT NULL DEFAULT 'active',
ADD CONSTRAINT "colocations_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "colocations_id_seq";

-- AlterTable
ALTER TABLE "dedicated_servers" DROP CONSTRAINT "dedicated_servers_pkey",
DROP COLUMN "assigned_at",
DROP COLUMN "ips_json",
DROP COLUMN "label",
DROP COLUMN "specs_json",
ADD COLUMN     "auto_renew" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "backup_enabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "backup_retention_days" INTEGER NOT NULL DEFAULT 30,
ADD COLUMN     "backup_schedule" TEXT,
ADD COLUMN     "bandwidth_last_reset" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "bandwidth_tb" INTEGER NOT NULL DEFAULT 10,
ADD COLUMN     "bandwidth_used_in_gb" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "bandwidth_used_out_gb" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "billing_cycle" "BillingCycle" NOT NULL DEFAULT 'monthly',
ADD COLUMN     "cancellation_notice_days" INTEGER NOT NULL DEFAULT 30,
ADD COLUMN     "contract_end" TIMESTAMP(3),
ADD COLUMN     "contract_start" TIMESTAMP(3),
ADD COLUMN     "cpu_cores" INTEGER NOT NULL,
ADD COLUMN     "cpu_model" TEXT NOT NULL,
ADD COLUMN     "cpu_speed" TEXT NOT NULL,
ADD COLUMN     "cpu_threads" INTEGER NOT NULL,
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "ddos_protection" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "ddos_protection_level" TEXT,
ADD COLUMN     "hostname" TEXT NOT NULL,
ADD COLUMN     "ipmi_ip" TEXT,
ADD COLUMN     "ipmi_password" TEXT,
ADD COLUMN     "ipmi_user" TEXT,
ADD COLUMN     "ipv4_count" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "ipv6_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "kvm_enabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "kvm_type" TEXT,
ADD COLUMN     "kvm_url" TEXT,
ADD COLUMN     "last_boot_at" TIMESTAMP(3),
ADD COLUMN     "last_check_at" TIMESTAMP(3),
ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "monitoring_enabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "monthly_price" DECIMAL(10,2) NOT NULL,
ADD COLUMN     "name" TEXT NOT NULL,
ADD COLUMN     "network_port" TEXT NOT NULL DEFAULT '1 Gbps',
ADD COLUMN     "next_billing_date" TIMESTAMP(3),
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "os" TEXT,
ADD COLUMN     "os_version" TEXT,
ADD COLUMN     "provisioned_at" TIMESTAMP(3),
ADD COLUMN     "provisioning_status" "ProvisioningStatus" NOT NULL DEFAULT 'pending',
ADD COLUMN     "rack_id" TEXT,
ADD COLUMN     "rack_position" TEXT,
ADD COLUMN     "ram_gb" INTEGER NOT NULL,
ADD COLUMN     "ram_speed" TEXT,
ADD COLUMN     "ram_type" TEXT NOT NULL DEFAULT 'DDR4',
ADD COLUMN     "root_password" TEXT,
ADD COLUMN     "setup_fee" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "ssh_port" INTEGER NOT NULL DEFAULT 22,
ADD COLUMN     "tags" TEXT[],
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "uptime_percentage" DOUBLE PRECISION NOT NULL DEFAULT 0,
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "user_id" DROP NOT NULL,
DROP COLUMN "status",
ADD COLUMN     "status" "ServerStatus" NOT NULL DEFAULT 'pending',
ADD CONSTRAINT "dedicated_servers_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "dedicated_servers_id_seq";

-- AlterTable
ALTER TABLE "ip_addresses" ADD COLUMN     "colocation_id" TEXT,
ADD COLUMN     "dedicated_server_id" TEXT;

-- AlterTable
ALTER TABLE "vms" ADD COLUMN     "planId" INTEGER,
ALTER COLUMN "plan_id" SET DATA TYPE TEXT;

-- CreateTable
CREATE TABLE "dedicated_server_storage" (
    "id" TEXT NOT NULL,
    "server_id" TEXT NOT NULL,
    "type" "StorageType" NOT NULL,
    "size_gb" INTEGER NOT NULL,
    "raid_level" TEXT,
    "drive_count" INTEGER NOT NULL DEFAULT 1,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dedicated_server_storage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bandwidth_usage" (
    "id" TEXT NOT NULL,
    "server_id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "in_gb" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "out_gb" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total_gb" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "percentile_95_in" DOUBLE PRECISION,
    "percentile_95_out" DOUBLE PRECISION,

    CONSTRAINT "bandwidth_usage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "power_usage" (
    "id" TEXT NOT NULL,
    "server_id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "power_watts" DOUBLE PRECISION NOT NULL,
    "voltage" DOUBLE PRECISION,
    "current_amps" DOUBLE PRECISION,

    CONSTRAINT "power_usage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "server_logs" (
    "id" TEXT NOT NULL,
    "server_id" TEXT NOT NULL,
    "log_type" "ServerLogType" NOT NULL,
    "severity" "LogSeverity" NOT NULL DEFAULT 'info',
    "message" TEXT NOT NULL,
    "details" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "server_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "maintenance_windows" (
    "id" TEXT NOT NULL,
    "server_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "start_at" TIMESTAMP(3) NOT NULL,
    "end_at" TIMESTAMP(3) NOT NULL,
    "status" "MaintenanceStatus" NOT NULL DEFAULT 'scheduled',
    "created_by" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "maintenance_windows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "colocation_power_feeds" (
    "id" TEXT NOT NULL,
    "colocation_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "voltage" INTEGER NOT NULL DEFAULT 230,
    "amperage" INTEGER NOT NULL DEFAULT 16,
    "phase" TEXT NOT NULL DEFAULT 'single',
    "power_kw" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" "PowerFeedStatus" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "colocation_power_feeds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "colocation_access_logs" (
    "id" TEXT NOT NULL,
    "colocation_id" TEXT NOT NULL,
    "user_name" TEXT NOT NULL,
    "user_email" TEXT,
    "company" TEXT,
    "access_type" "AccessType" NOT NULL,
    "access_method" "AccessMethod" NOT NULL,
    "escorted_by" TEXT,
    "reason" TEXT,
    "status" "AccessStatus" NOT NULL DEFAULT 'success',
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "duration_minutes" INTEGER,

    CONSTRAINT "colocation_access_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "racks" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "datacenter" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "total_units" INTEGER NOT NULL DEFAULT 42,
    "used_units" INTEGER NOT NULL DEFAULT 0,
    "available_units" INTEGER NOT NULL DEFAULT 42,
    "power_capacity_kw" DOUBLE PRECISION NOT NULL DEFAULT 10,
    "power_used_kw" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "temperature_c" DOUBLE PRECISION,
    "humidity_percent" DOUBLE PRECISION,
    "status" "RackStatus" NOT NULL DEFAULT 'operational',
    "last_inspection" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "racks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rack_devices" (
    "id" TEXT NOT NULL,
    "rack_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "DeviceType" NOT NULL,
    "position" INTEGER NOT NULL,
    "size_u" INTEGER NOT NULL,
    "status" "DeviceStatus" NOT NULL DEFAULT 'online',
    "power_draw_watts" DOUBLE PRECISION,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rack_devices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "short_description" TEXT,
    "description" TEXT,
    "price" DECIMAL(10,2) NOT NULL,
    "discount_price" DECIMAL(10,2),
    "cost_price" DECIMAL(10,2),
    "tax_rate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tax_inclusive" BOOLEAN NOT NULL DEFAULT false,
    "stock_quantity" INTEGER NOT NULL DEFAULT 0,
    "low_stock_threshold" INTEGER NOT NULL DEFAULT 5,
    "stock_status" "StockStatus" NOT NULL DEFAULT 'in_stock',
    "backorder_allowed" BOOLEAN NOT NULL DEFAULT false,
    "weight_kg" DOUBLE PRECISION,
    "dimensions_cm" JSONB,
    "shipping_class" TEXT,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "status" "ProductStatus" NOT NULL DEFAULT 'draft',
    "images" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "thumbnail" TEXT,
    "specifications" JSONB,
    "meta_title" TEXT,
    "meta_description" TEXT,
    "meta_keywords" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "parent_id" TEXT,
    "image" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_category_relations" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "product_category_relations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_reviews" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "user_id" INTEGER NOT NULL,
    "rating" INTEGER NOT NULL,
    "title" TEXT,
    "content" TEXT,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "is_approved" BOOLEAN NOT NULL DEFAULT false,
    "helpful_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vm_plans" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "tagline" TEXT,
    "category" "PlanCategory" NOT NULL DEFAULT 'starter',
    "is_popular" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "vcpu" INTEGER NOT NULL,
    "ram_gb" INTEGER NOT NULL,
    "storage_gb" INTEGER NOT NULL,
    "storage_type" TEXT NOT NULL DEFAULT 'NVMe',
    "bandwidth_tb" INTEGER NOT NULL DEFAULT 1,
    "ipv4_count" INTEGER NOT NULL DEFAULT 1,
    "pricing" JSONB NOT NULL,
    "setup_fee" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "features" TEXT[],
    "datacenters" TEXT[],
    "os_options" TEXT[],
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vm_plans_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "bandwidth_usage_server_id_date_key" ON "bandwidth_usage"("server_id", "date");

-- CreateIndex
CREATE INDEX "server_logs_server_id_idx" ON "server_logs"("server_id");

-- CreateIndex
CREATE INDEX "server_logs_log_type_idx" ON "server_logs"("log_type");

-- CreateIndex
CREATE INDEX "server_logs_created_at_idx" ON "server_logs"("created_at");

-- CreateIndex
CREATE INDEX "colocation_access_logs_colocation_id_idx" ON "colocation_access_logs"("colocation_id");

-- CreateIndex
CREATE INDEX "colocation_access_logs_timestamp_idx" ON "colocation_access_logs"("timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "racks_name_key" ON "racks"("name");

-- CreateIndex
CREATE INDEX "racks_datacenter_idx" ON "racks"("datacenter");

-- CreateIndex
CREATE INDEX "racks_status_idx" ON "racks"("status");

-- CreateIndex
CREATE UNIQUE INDEX "rack_devices_rack_id_position_key" ON "rack_devices"("rack_id", "position");

-- CreateIndex
CREATE UNIQUE INDEX "products_slug_key" ON "products"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "products_sku_key" ON "products"("sku");

-- CreateIndex
CREATE INDEX "products_status_idx" ON "products"("status");

-- CreateIndex
CREATE INDEX "products_featured_idx" ON "products"("featured");

-- CreateIndex
CREATE UNIQUE INDEX "product_categories_slug_key" ON "product_categories"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "product_category_relations_product_id_category_id_key" ON "product_category_relations"("product_id", "category_id");

-- CreateIndex
CREATE UNIQUE INDEX "vm_plans_slug_key" ON "vm_plans"("slug");

-- CreateIndex
CREATE INDEX "vm_plans_category_idx" ON "vm_plans"("category");

-- CreateIndex
CREATE INDEX "vm_plans_is_active_idx" ON "vm_plans"("is_active");

-- CreateIndex
CREATE INDEX "colocations_user_id_idx" ON "colocations"("user_id");

-- CreateIndex
CREATE INDEX "colocations_status_idx" ON "colocations"("status");

-- CreateIndex
CREATE INDEX "colocations_datacenter_idx" ON "colocations"("datacenter");

-- CreateIndex
CREATE UNIQUE INDEX "colocations_datacenter_rack_id_unit_position_key" ON "colocations"("datacenter", "rack_id", "unit_position");

-- CreateIndex
CREATE UNIQUE INDEX "dedicated_servers_hostname_key" ON "dedicated_servers"("hostname");

-- CreateIndex
CREATE INDEX "dedicated_servers_user_id_idx" ON "dedicated_servers"("user_id");

-- CreateIndex
CREATE INDEX "dedicated_servers_status_idx" ON "dedicated_servers"("status");

-- CreateIndex
CREATE INDEX "dedicated_servers_datacenter_idx" ON "dedicated_servers"("datacenter");

-- CreateIndex
CREATE UNIQUE INDEX "dedicated_servers_datacenter_rack_id_rack_position_key" ON "dedicated_servers"("datacenter", "rack_id", "rack_position");

-- AddForeignKey
ALTER TABLE "vms" ADD CONSTRAINT "vms_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "vm_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vms" ADD CONSTRAINT "vms_planId_fkey" FOREIGN KEY ("planId") REFERENCES "plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ip_addresses" ADD CONSTRAINT "ip_addresses_dedicated_server_id_fkey" FOREIGN KEY ("dedicated_server_id") REFERENCES "dedicated_servers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ip_addresses" ADD CONSTRAINT "ip_addresses_colocation_id_fkey" FOREIGN KEY ("colocation_id") REFERENCES "colocations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dedicated_servers" ADD CONSTRAINT "dedicated_servers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dedicated_server_storage" ADD CONSTRAINT "dedicated_server_storage_server_id_fkey" FOREIGN KEY ("server_id") REFERENCES "dedicated_servers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bandwidth_usage" ADD CONSTRAINT "bandwidth_usage_server_id_fkey" FOREIGN KEY ("server_id") REFERENCES "dedicated_servers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "power_usage" ADD CONSTRAINT "power_usage_server_id_fkey" FOREIGN KEY ("server_id") REFERENCES "dedicated_servers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "server_logs" ADD CONSTRAINT "server_logs_server_id_fkey" FOREIGN KEY ("server_id") REFERENCES "dedicated_servers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_windows" ADD CONSTRAINT "maintenance_windows_server_id_fkey" FOREIGN KEY ("server_id") REFERENCES "dedicated_servers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "colocations" ADD CONSTRAINT "colocations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "colocation_power_feeds" ADD CONSTRAINT "colocation_power_feeds_colocation_id_fkey" FOREIGN KEY ("colocation_id") REFERENCES "colocations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "colocation_access_logs" ADD CONSTRAINT "colocation_access_logs_colocation_id_fkey" FOREIGN KEY ("colocation_id") REFERENCES "colocations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rack_devices" ADD CONSTRAINT "rack_devices_rack_id_fkey" FOREIGN KEY ("rack_id") REFERENCES "racks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_categories" ADD CONSTRAINT "product_categories_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "product_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_category_relations" ADD CONSTRAINT "product_category_relations_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_category_relations" ADD CONSTRAINT "product_category_relations_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "product_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_reviews" ADD CONSTRAINT "product_reviews_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_reviews" ADD CONSTRAINT "product_reviews_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
