-- AlterTable
ALTER TABLE "ip_addresses" ADD COLUMN     "mac_address" TEXT,
ADD COLUMN     "pool_id" INTEGER;

-- CreateTable
CREATE TABLE "ip_pools" (
    "id" SERIAL NOT NULL,
    "pop_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "subnet" TEXT NOT NULL,
    "gateway" TEXT,
    "start_ip" TEXT NOT NULL,
    "end_ip" TEXT NOT NULL,
    "total_ips" INTEGER NOT NULL,
    "used_ips" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ip_pools_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ip_pools_pop_id_subnet_key" ON "ip_pools"("pop_id", "subnet");

-- AddForeignKey
ALTER TABLE "ip_pools" ADD CONSTRAINT "ip_pools_pop_id_fkey" FOREIGN KEY ("pop_id") REFERENCES "pops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ip_addresses" ADD CONSTRAINT "ip_addresses_pool_id_fkey" FOREIGN KEY ("pool_id") REFERENCES "ip_pools"("id") ON DELETE SET NULL ON UPDATE CASCADE;
