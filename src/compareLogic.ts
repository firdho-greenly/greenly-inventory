import type { PrismaClient } from "@prisma/client";
import type { CompareRow, FlagType } from "./types.js";

const THRESHOLD = 100_000;

export interface CompareResult {
  prevBulan: string;
  rows: CompareRow[];
}

/** Cari bulan terakhir yang lebih kecil dari `currentBulan` di database. */
export async function findPrevBulan(
  prisma: PrismaClient,
  currentBulan: string
): Promise<string | null> {
  const prev = await prisma.soData.findFirst({
    where: { bulan: { lt: currentBulan } },
    orderBy: { bulan: "desc" },
    select: { bulan: true },
    distinct: ["bulan"],
  });
  return prev?.bulan ?? null;
}

function resolveFlag(selisihCurrent: number, selisihPrev: number): FlagType | null {
  if (selisihCurrent <= -THRESHOLD) {
    return selisihPrev >= THRESHOLD ? "Minus besar - kemungkinan plus minus" : "Minus besar";
  }
  if (selisihCurrent >= THRESHOLD) {
    return selisihPrev <= -THRESHOLD ? "Plus besar - kemungkinan plus minus" : "Plus besar";
  }
  return null;
}

export async function compareMonths(
  prisma: PrismaClient,
  currentBulan: string,
  prevBulan: string
): Promise<CompareRow[]> {
  const [currentData, prevData] = await Promise.all([
    prisma.soData.findMany({ where: { bulan: currentBulan } }),
    prisma.soData.findMany({ where: { bulan: prevBulan } }),
  ]);

  const prevMap = new Map<string, { selisih: number; qty: number | null }>();
  for (const row of prevData) {
    prevMap.set(`${row.sku}|${row.lokasi}`, {
      selisih: row.selisih.toNumber(),
      qty: row.selisihQty?.toNumber() ?? null,
    });
  }

  const rows: CompareRow[] = [];
  for (const row of currentData) {
    const key = `${row.sku}|${row.lokasi}`;
    const prev = prevMap.get(key);
    if (prev === undefined) continue; // hanya muncul di bulan current — diabaikan

    const selisihCurrent = row.selisih.toNumber();
    const flag = resolveFlag(selisihCurrent, prev.selisih);
    if (!flag) continue; // selisih current tidak "besar" — diabaikan

    rows.push({
      sku: row.sku,
      lokasi: row.lokasi,
      selisihPrev: prev.selisih,
      selisihCurrent,
      qtyPrev: prev.qty,
      qtyCurrent: row.selisihQty?.toNumber() ?? null,
      flag,
    });
  }

  return rows;
}
