export interface SoRow {
  sku: string;
  lokasi: string;
  selisih: number;
  selisihQty: number | null;
}

export interface InvalidRow {
  rowNumber: number;
  reason: string;
}

export interface ParseResult {
  valid: SoRow[];
  invalid: InvalidRow[];
}

export type FlagType =
  | "Minus besar - kemungkinan plus minus"
  | "Minus besar"
  | "Plus besar - kemungkinan plus minus"
  | "Plus besar";

export interface CompareRow {
  sku: string;
  lokasi: string;
  selisihPrev: number;
  selisihCurrent: number;
  qtyPrev: number | null;
  qtyCurrent: number | null;
  flag: FlagType;
}
