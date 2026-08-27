-- CreateTable
CREATE TABLE "so_data" (
    "id" SERIAL NOT NULL,
    "sku" TEXT NOT NULL,
    "lokasi" TEXT NOT NULL,
    "bulan" TEXT NOT NULL,
    "selisih" DECIMAL(14,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "so_data_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "so_data_bulan_idx" ON "so_data"("bulan");

-- CreateIndex
CREATE UNIQUE INDEX "so_data_sku_lokasi_bulan_key" ON "so_data"("sku", "lokasi", "bulan");
