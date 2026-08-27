import ExcelJS from "exceljs";
import type { CompareRow } from "./types.js";

const BULAN_ID = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

export function namaBulan(bulan: string): string {
  const [year, month] = bulan.split("-");
  const idx = Number(month) - 1;
  return `${BULAN_ID[idx] ?? month} ${year}`;
}

export async function exportHasilCekSo(
  rows: CompareRow[],
  currentBulan: string,
  prevBulan: string,
  outPath: string
): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Hasil Cek SO");

  sheet.columns = [
    { header: "SKU", key: "sku", width: 20 },
    { header: "Lokasi", key: "lokasi", width: 24 },
    { header: `Selisih_${namaBulan(prevBulan)}`, key: "selisihPrev", width: 22 },
    { header: `Qty_${namaBulan(prevBulan)}`, key: "qtyPrev", width: 16 },
    { header: `Selisih_${namaBulan(currentBulan)}`, key: "selisihCurrent", width: 22 },
    { header: `Qty_${namaBulan(currentBulan)}`, key: "qtyCurrent", width: 16 },
    { header: "Flag", key: "flag", width: 36 },
  ];
  sheet.getRow(1).font = { bold: true };

  for (const row of rows) {
    sheet.addRow({
      sku: row.sku,
      lokasi: row.lokasi,
      selisihPrev: row.selisihPrev,
      qtyPrev: row.qtyPrev,
      selisihCurrent: row.selisihCurrent,
      qtyCurrent: row.qtyCurrent,
      flag: row.flag,
    });
  }

  sheet.getColumn("selisihPrev").numFmt = "#,##0";
  sheet.getColumn("selisihCurrent").numFmt = "#,##0";
  sheet.getColumn("qtyPrev").numFmt = "#,##0.##";
  sheet.getColumn("qtyCurrent").numFmt = "#,##0.##";

  await workbook.xlsx.writeFile(outPath);
}
