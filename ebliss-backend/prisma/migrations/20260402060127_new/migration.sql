-- CreateTable
CREATE TABLE "locations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "displayName" TEXT,
    "country" TEXT,
    "city" TEXT,
    "flag" TEXT,
    "latency" INTEGER,
    "priceMultiplier" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "available" BOOLEAN NOT NULL DEFAULT true,
    "features" TEXT[],
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "locations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "locations_name_key" ON "locations"("name");
