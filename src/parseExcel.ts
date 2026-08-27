import ExcelJS from "exceljs";
import { z } from "zod";
import type { InvalidRow, ParseResult, SoRow } from "./types.js";

const SHEET_NAME = "Selisih Stok";

// alias -> field: supports both the brief's generic header names and the
// real KPI_Output export (Product/Branch/Difference Value).
const COLUMN_ALIASES: Record<string, "sku" | "lokasi" | "selisih" | "selisihQty"> = {
  sku: "sku",
  product: "sku",
  lokasi: "lokasi",
  branch: "lokasi",
  selisih: "selisih",
  "difference value": "selisih",
  qty: "selisihQty",
  "selisih qty": "selisihQty",
  "difference qty": "selisihQty",
};
const REQUIRED_COLUMNS = ["sku", "lokasi", "selisih"] as const;

const rowSchema = z.object({
  sku: z.string().trim().min(1),
  lokasi: z.string().trim().min(1),
  selisih: z.number().finite(),
  selisihQty: z.number().finite().nullable(),
});

function normalizeHeader(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

function cellToString(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "object" && "result" in value) {
    return cellToString((value as { result: ExcelJS.CellValue }).result);
  }
  if (typeof value === "object" && "text" in value) {
    return String((value as { text: unknown }).text);
  }
  return String(value).trim();
}

function cellToNumber(value: ExcelJS.CellValue): number {
  if (value === null || value === undefined) return NaN;
  if (typeof value === "number") return value;
  if (typeof value === "object" && "result" in value) {
    return cellToNumber((value as { result: ExcelJS.CellValue }).result);
  }
  const raw = cellToString(value);
  if (raw === "") return NaN;
  const direct = Number(raw);
  if (!Number.isNaN(direct)) return direct;
  // fallback: "1.234.567,89" style — strip thousands dots, comma as decimal
  return Number(raw.replace(/\./g, "").replace(",", "."));
}

export async function parseSoExcel(filePath: string): Promise<ParseResult> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);
  const sheet = workbook.getWorksheet(SHEET_NAME) ?? workbook.worksheets[0];
  if (!sheet) {
    throw new Error(`File Excel tidak punya sheet: ${filePath}`);
  }

  const headerRow = sheet.getRow(1);
  const colIndex: Record<string, number> = {};
  headerRow.eachCell((cell, colNumber) => {
    const header = normalizeHeader(cell.value);
    const field = COLUMN_ALIASES[header];
    if (field && !(field in colIndex)) {
      colIndex[field] = colNumber;
    }
  });

  const missing = REQUIRED_COLUMNS.filter((col) => !(col in colIndex));
  if (missing.length > 0) {
    throw new Error(
      `Kolom wajib tidak ditemukan di sheet "${sheet.name}": ${missing.join(", ")}. ` +
        `Pastikan ada kolom SKU/Product, Lokasi/Branch, Selisih/Difference Value di baris pertama.`
    );
  }

  const valid: SoRow[] = [];
  const invalid: InvalidRow[] = [];

  for (let rowNumber = 2; rowNumber <= sheet.rowCount; rowNumber++) {
    const row = sheet.getRow(rowNumber);
    if (row.cellCount === 0) continue;

    const skuCell = row.getCell(colIndex.sku).value;
    const lokasiCell = row.getCell(colIndex.lokasi).value;
    const selisihCell = row.getCell(colIndex.selisih).value;
    const selisihQtyCell = colIndex.selisihQty ? row.getCell(colIndex.selisihQty).value : undefined;

    const sku = cellToString(skuCell);
    const lokasi = cellToString(lokasiCell);
    if (!sku && !lokasi && (selisihCell === null || selisihCell === undefined)) {
      continue; // baris kosong, skip diam-diam
    }

    const selisih = cellToNumber(selisihCell);
    const selisihQtyNum = colIndex.selisihQty ? cellToNumber(selisihQtyCell) : NaN;
    const selisihQty = Number.isNaN(selisihQtyNum) ? null : selisihQtyNum;
    const parsed = rowSchema.safeParse({ sku, lokasi, selisih, selisihQty });

    if (!parsed.success) {
      invalid.push({
        rowNumber,
        reason: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
      });
      continue;
    }

    valid.push(parsed.data);
  }

  return { valid, invalid };
}
