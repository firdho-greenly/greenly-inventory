import type { PrismaClient } from "@prisma/client";
import type { SoRow } from "./types.js";

export async function upsertSoData(
  prisma: PrismaClient,
  rows: SoRow[],
  bulan: string
): Promise<void> {
  for (const row of rows) {
    await prisma.soData.upsert({
      where: {
        sku_lokasi_bulan: {
          sku: row.sku,
          lokasi: row.lokasi,
          bulan,
        },
      },
      update: {
        selisih: row.selisih,
        selisihQty: row.selisihQty,
      },
      create: {
        sku: row.sku,
        lokasi: row.lokasi,
        bulan,
        selisih: row.selisih,
        selisihQty: row.selisihQty,
      },
    });
  }
}
