# Greenly - Inventory — Cek Selisih Stok SO (Stock Opname)

CLI Node.js/TypeScript untuk cek selisih stok SO bulanan: bandingkan bulan
current vs bulan sebelumnya, flag anomali plus-minus besar.

Sebelumnya dikembangkan lewat Claude chat biasa (claude.ai), sekarang pindah
ke Claude Code.

**Catatan:** ada file `CLAUDE.md` lain milik project **forecasting & inventory
Prophet pipeline** (VPS Python, Google Sheets, guard system) — itu project
terpisah, tidak dipakai di folder ini. Kemungkinan akan bersinggungan dengan
project ini di masa depan (sama-sama domain inventory Greenly), tapi belum
sekarang.

---

## Alur kerja

```
File Excel SO bulanan (--input)
    ↓ parseExcel.ts     → validasi baris (zod), skip baris invalid
    ↓ upsertData.ts     → upsert ke Postgres (unique: sku+lokasi+bulan)
    ↓ compareLogic.ts   → cari bulan sebelumnya otomatis, bandingkan selisih
    ↓ exportExcel.ts    → tulis hasil_cek_so_<bulan>.xlsx
```

## Command

```bash
npm run cek-so -- --input path/ke/file.xlsx --bulan 2026-08
```

- `--input` — path file Excel data SO bulanan (sheet "Selisih Stok" atau sheet pertama)
- `--bulan` — format `YYYY-MM`

Kolom Excel yang diterima (case-insensitive, alias didukung):
- SKU / Product
- Lokasi / Branch
- Selisih / Difference Value (rupiah, dipakai untuk threshold flag)
- Qty / Selisih Qty / Difference Qty (opsional, display-only)

## Logika flag

Threshold: **Rp 100.000** (`THRESHOLD` di `src/compareLogic.ts`).

| Selisih current | Selisih prev | Flag |
|---|---|---|
| ≤ -100rb | ≥ +100rb | Minus besar - kemungkinan plus minus |
| ≤ -100rb | lainnya | Minus besar |
| ≥ +100rb | ≤ -100rb | Plus besar - kemungkinan plus minus |
| ≥ +100rb | lainnya | Plus besar |
| di antara ±100rb | — | tidak di-flag |

"Kemungkinan plus minus" = indikasi kesalahan input yang saling menutupi
antar bulan (misal salah catat minus bulan lalu, dikoreksi berlebihan bulan
ini).

Baris yang cuma muncul di satu bulan (tidak ada pasangan sku+lokasi di bulan
lain) **diabaikan**, bukan di-flag.

## Database

Postgres, **satu instance & database yang sama dengan project "Greenly -
Salary"** (`greenly`), tapi skema terpisah (`?schema=inventory` di
`DATABASE_URL`) — migration history tidak tercampur. Salary pakai
`prisma db push` di skema `public` tanpa tabel migration; project ini pakai
`prisma migrate` biasa.

**Kalau Salary belum pernah di-deploy ke server yang sama:** database
`greenly` belum ada — project ini yang membuatnya duluan. Waktu Salary
di-deploy ke server itu nanti, arahkan ke database `greenly` yang sama
(schema `public`), jangan bikin database baru terpisah.

Tabel `so_data`: unique per `(sku, lokasi, bulan)`, upsert per run — aman
dijalankan ulang untuk bulan yang sama tanpa duplikat.

## Struktur file

```
src/
├── index.ts          # CLI entrypoint (commander)
├── parseExcel.ts      # baca + validasi Excel (exceljs + zod)
├── upsertData.ts       # upsert ke Postgres
├── compareLogic.ts     # cari bulan prev, hitung flag
├── exportExcel.ts      # tulis hasil_cek_so_<bulan>.xlsx
├── types.ts            # shared types
└── db.ts               # Prisma client singleton
prisma/
├── schema.prisma
└── migrations/
```

## Setup lokal

```bash
npm install
cp .env.example .env   # isi DATABASE_URL
npx prisma migrate deploy
```

## Yang belum digarap

- Belum ada automated test
- Belum ada scheduling/otomatisasi — dijalankan manual tiap bulan
- Belum di-deploy ke VPS / belum ada git remote
- Threshold Rp 100.000 hardcoded, belum bisa dikonfigurasi per SKU/lokasi
