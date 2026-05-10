// scripts/import_mtm_excel.cjs
// Usage:
// node scripts/import_mtm_excel.cjs "path/to/mtm_siyahi.csv"
// CSV format (delimiter ;): Regional Təhsil İdarəsi;Rayon;Müəssisə

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const admin = require("firebase-admin");
const { parse } = require("csv-parse/sync");

const serviceAccountPath = path.join(__dirname, "..", "serviceAccountKey.json");

if (!fs.existsSync(serviceAccountPath)) {
  console.error("serviceAccountKey.json tapılmadı:", serviceAccountPath);
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(require(serviceAccountPath)),
});

const db = admin.firestore();

function makeDocId(regional, rayon, adi) {
  const key = `${regional}||${rayon}||${adi}`.toLowerCase().trim();
  return crypto.createHash("sha1").update(key).digest("hex");
}

async function main() {
  const csvPathArg = process.argv[2];
  if (!csvPathArg) {
    console.error('CSV yolu verilməyib. Məs: node scripts/import_mtm_excel.cjs "mtm_siyahi.csv"');
    process.exit(1);
  }

  const csvPath = path.isAbsolute(csvPathArg)
    ? csvPathArg
    : path.join(process.cwd(), csvPathArg);

  if (!fs.existsSync(csvPath)) {
    console.error("CSV faylı tapılmadı:", csvPath);
    process.exit(1);
  }

  const raw = fs.readFileSync(csvPath, "utf8");

  // CSV: Regional Təhsil İdarəsi;Rayon;Müəssisə
  const records = parse(raw, {
    columns: ["regionalIdare", "rayon", "adi"],
    skip_empty_lines: true,
    delimiter: ";",
    bom: true,
    trim: true,
    from_line: 2 // İlk sətir başlıqlardırsa, onu ötürük
  });

  const cleaned = records
    .map((r, idx) => ({
      regionalIdare: (r.regionalIdare || "").trim(),
      rayon: (r.rayon || "").trim(),
      adi: (r.adi || "").trim(),
      _line: idx + 2,
    }))
    .filter((r) => r.regionalIdare && r.rayon && r.adi);

  const total = cleaned.length;
  console.log("Oxunan sətir:", total);

  const bulkWriter = db.bulkWriter();
  let written = 0;

  bulkWriter.onWriteResult(() => {
    written++;
    if (written % 50 === 0) console.log(`Yazıldı: ${written}/${total}`);
  });

  bulkWriter.onWriteError((error) => {
    console.error("Write error:", error);
    return false;
  });

  // MTM (Bağça) məlumatları üçün kolleksiya 'bagcalar' olaraq qalır, sadəcə yeni strukturla yazılır
  const colRef = db.collection("bagcalar");

  for (const r of cleaned) {
    const docId = makeDocId(r.regionalIdare, r.rayon, r.adi);
    const docRef = colRef.doc(docId);

    bulkWriter.set(
      docRef,
      { regionalIdare: r.regionalIdare, rayon: r.rayon, adi: r.adi },
      { merge: true }
    );
  }

  await bulkWriter.close();
  console.log("Import tamamlandı. Cəmi yazılan/yenilənən:", total);
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
