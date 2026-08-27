import { Command } from "commander";
import { prisma } from "./db.js";
import { parseSoExcel } from "./parseExcel.js";
import { upsertSoData } from "./upsertData.js";
import { compareMonths, findPrevBulan } from "./compareLogic.js";
import { exportHasilCekSo, namaBulan } from "./exportExcel.js";

const program = new Command();

program
  .requiredOption("--input <path>", "path ke file .xlsx data SO bulanan")
  .requiredOption("--bulan <YYYY-MM>", "bulan data, format YYYY-MM")
  .parse(process.argv);

const opts = program.opts<{ input: string; bulan: string }>();

if (!/^\d{4}-\d{2}$/.test(opts.bulan)) {
  console.error(`--bulan harus format YYYY-MM, contoh: 2026-08 (dapat: "${opts.bulan}")`);
  process.exit(1);
}

async function main() {
  console.log(`Membaca ${opts.input} ...`);
  const { valid, invalid } = await parseSoExcel(opts.input);

  if (invalid.length > 0) {
    console.warn(`\n${invalid.length} baris dilewati (invalid):`);
    for (const row of invalid) {
      console.warn(`  - baris ${row.rowNumber}: ${row.reason}`);
    }
    console.warn("");
  }

  if (valid.length === 0) {
    console.error("Tidak ada baris valid untuk disimpan. Proses dihentikan.");
    process.exit(1);
  }

  console.log(`Menyimpan ${valid.length} baris valid ke database (bulan=${opts.bulan}) ...`);
  await upsertSoData(prisma, valid, opts.bulan);

  const prevBulan = await findPrevBulan(prisma, opts.bulan);
  if (!prevBulan) {
    console.log(
      `\nData bulan ${opts.bulan} sudah tersimpan. Tidak ada bulan pembanding sebelumnya ` +
        `di database, jadi proses compare di-skip (ini kemungkinan bulan pertama).`
    );
    return;
  }

  console.log(`Bulan pembanding otomatis: ${prevBulan} (${namaBulan(prevBulan)})`);
  const rows = await compareMonths(prisma, opts.bulan, prevBulan);

  const outPath = `hasil_cek_so_${opts.bulan}.xlsx`;
  await exportHasilCekSo(rows, opts.bulan, prevBulan, outPath);

  console.log(`\n${rows.length} baris di-flag untuk dicek manual.`);
  console.log(`Output: ${outPath}`);
}

main()
  .catch((err) => {
    console.error("Gagal:", err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
