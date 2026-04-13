/*
  Warnings:

  - You are about to drop the column `author_id` on the `ticket_messages` table. All the data in the column will be lost.
  - You are about to drop the column `body` on the `ticket_messages` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[ticket_number]` on the table `tickets` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `message` to the `ticket_messages` table without a default value. This is not possible if the table is not empty.
  - Added the required column `description` to the `tickets` table without a default value. This is not possible if the table is not empty.
  - Added the required column `ticket_number` to the `tickets` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `tickets` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `department` on the `tickets` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "TicketDepartment" AS ENUM ('sales', 'billing', 'technical', 'abuse', 'general');

-- AlterTable
ALTER TABLE "ticket_messages" DROP COLUMN "author_id",
DROP COLUMN "body",
ADD COLUMN     "admin_id" INTEGER,
ADD COLUMN     "message" TEXT NOT NULL,
ADD COLUMN     "user_id" INTEGER;

-- AlterTable
ALTER TABLE "tickets" ADD COLUMN     "assigned_to" INTEGER,
ADD COLUMN     "closed_at" TIMESTAMP(3),
ADD COLUMN     "description" TEXT NOT NULL,
ADD COLUMN     "first_response_at" TIMESTAMP(3),
ADD COLUMN     "last_reply_at" TIMESTAMP(3),
ADD COLUMN     "resolution_due_at" TIMESTAMP(3),
ADD COLUMN     "resolved_at" TIMESTAMP(3),
ADD COLUMN     "response_due_at" TIMESTAMP(3),
ADD COLUMN     "sla_breached" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "ticket_number" TEXT NOT NULL,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL,
DROP COLUMN "department",
ADD COLUMN     "department" "TicketDepartment" NOT NULL;

-- CreateTable
CREATE TABLE "ticket_internal_notes" (
    "id" SERIAL NOT NULL,
    "ticket_id" INTEGER NOT NULL,
    "admin_id" INTEGER NOT NULL,
    "note" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ticket_internal_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ticket_attachments" (
    "id" SERIAL NOT NULL,
    "ticket_id" INTEGER NOT NULL,
    "message_id" INTEGER,
    "filename" TEXT NOT NULL,
    "file_size" INTEGER NOT NULL,
    "mime_type" TEXT NOT NULL,
    "file_path" TEXT NOT NULL,
    "uploaded_by" INTEGER NOT NULL,
    "uploaded_by_type" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ticket_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sla_policies" (
    "id" SERIAL NOT NULL,
    "priority" "TicketPriority" NOT NULL,
    "first_response_hours" INTEGER NOT NULL DEFAULT 24,
    "resolution_hours" INTEGER NOT NULL DEFAULT 72,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sla_policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ticket_settings" (
    "id" SERIAL NOT NULL,
    "auto_close_days" INTEGER NOT NULL DEFAULT 7,
    "max_attachments" INTEGER NOT NULL DEFAULT 5,
    "max_file_size_mb" INTEGER NOT NULL DEFAULT 10,
    "allowed_file_types" TEXT[] DEFAULT ARRAY['image/jpeg', 'image/png', 'application/pdf', 'text/plain']::TEXT[],
    "notify_on_new_ticket" BOOLEAN NOT NULL DEFAULT true,
    "notify_on_reply" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ticket_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ticket_internal_notes_ticket_id_idx" ON "ticket_internal_notes"("ticket_id");

-- CreateIndex
CREATE UNIQUE INDEX "sla_policies_priority_key" ON "sla_policies"("priority");

-- CreateIndex
CREATE INDEX "ticket_messages_ticket_id_idx" ON "ticket_messages"("ticket_id");

-- CreateIndex
CREATE INDEX "ticket_messages_created_at_idx" ON "ticket_messages"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "tickets_ticket_number_key" ON "tickets"("ticket_number");

-- CreateIndex
CREATE INDEX "tickets_user_id_idx" ON "tickets"("user_id");

-- CreateIndex
CREATE INDEX "tickets_status_idx" ON "tickets"("status");

-- CreateIndex
CREATE INDEX "tickets_department_idx" ON "tickets"("department");

-- CreateIndex
CREATE INDEX "tickets_priority_idx" ON "tickets"("priority");

-- CreateIndex
CREATE INDEX "tickets_ticket_number_idx" ON "tickets"("ticket_number");

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_messages" ADD CONSTRAINT "ticket_messages_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_messages" ADD CONSTRAINT "ticket_messages_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_internal_notes" ADD CONSTRAINT "ticket_internal_notes_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_internal_notes" ADD CONSTRAINT "ticket_internal_notes_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "admin_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_attachments" ADD CONSTRAINT "ticket_attachments_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
