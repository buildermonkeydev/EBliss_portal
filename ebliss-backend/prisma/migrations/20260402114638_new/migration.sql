-- CreateEnum
CREATE TYPE "ActivityType" AS ENUM ('sign_in', 'sign_out', 'create', 'update', 'delete', 'start', 'stop', 'reboot', 'security', 'other');

-- CreateEnum
CREATE TYPE "ServiceType" AS ENUM ('vps', 'firewall', 'ssh', 'billing', 'account', 'other');

-- CreateEnum
CREATE TYPE "ActivityStatus" AS ENUM ('success', 'failed', 'warning');

-- CreateTable
CREATE TABLE "activity_logs" (
    "id" TEXT NOT NULL,
    "user_id" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "action_type" "ActivityType" NOT NULL DEFAULT 'other',
    "description" TEXT NOT NULL,
    "service_type" "ServiceType" NOT NULL DEFAULT 'other',
    "service_name" TEXT,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "status" "ActivityStatus" NOT NULL DEFAULT 'success',
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "activity_logs_user_id_key" ON "activity_logs"("user_id");

-- CreateIndex
CREATE INDEX "activity_logs_user_id_idx" ON "activity_logs"("user_id");

-- CreateIndex
CREATE INDEX "activity_logs_created_at_idx" ON "activity_logs"("created_at");

-- CreateIndex
CREATE INDEX "activity_logs_action_idx" ON "activity_logs"("action");

-- CreateIndex
CREATE INDEX "activity_logs_service_type_idx" ON "activity_logs"("service_type");

-- CreateIndex
CREATE INDEX "activity_logs_status_idx" ON "activity_logs"("status");

-- AddForeignKey
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
