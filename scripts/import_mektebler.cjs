// scripts/import_mektebler.js
// Usage:
// node scripts/import_mektebler.js "path/to/utm ad siyahı.csv"

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const admin = require("firebase-admin");
const { parse } = require("csv-parse/sync");

// 1) Service account path (project root-da saxlayırsan)
const serviceAccountPath = path.join(__dirname, "..", "serviceAccountKey.json");

if (!fs.existsSync(serviceAccountPath)) {
  console.error("serviceAccountKey.json tapılmadı:", serviceAccountPath);
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(require(serviceAccountPath)),
});

const db = admin.firestore();

function makeDocId(rayon, adi) {
  // Stabil ID: eyni məktəb yenidən import edilsə, duplicate yaratmasın
  const key = `${rayon}||${adi}`.toLowerCase().trim();
  return crypto.createHash("sha1").update(key).digest("hex"); // 40 simvol
}

async function main() {
  const csvPathArg = process.argv[2];
  if (!csvPathArg) {
    console.error('CSV yolu verilməyib. Məs: node scripts/import_mektebler.js "utm ad siyahı.csv"');
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

  // CSV: rayon;adi
  const records = parse(raw, {
    columns: true,
    skip_empty_lines: true,
    delimiter: ";",
    bom: true,
    trim: true,
  });

  // Validasiya
  const cleaned = records
    .map((r, idx) => ({
      rayon: (r.rayon || "").trim(),
      adi: (r.adi || "").trim(),
      _line: idx + 2, // header 1-ci sətrdir
    }))
    .filter((r) => r.rayon && r.adi);

  const total = cleaned.length;
  console.log("Oxunan sətir:", total);

  // BulkWriter – sürətli və stabil
  const bulkWriter = db.bulkWriter();
  let written = 0;

  // İstəsən batch progress gör
  bulkWriter.onWriteResult(() => {
    written++;
    if (written % 50 === 0) console.log(`Yazıldı: ${written}/${total}`);
  });

  bulkWriter.onWriteError((error) => {
    console.error("Write error:", error);
    // retry etməsin deyə false qaytarırıq (istəsən true edib retry edə bilərsən)
    return false;
  });

  const colRef = db.collection("mektebler");

  for (const r of cleaned) {
    const docId = makeDocId(r.rayon, r.adi);
    const docRef = colRef.doc(docId);

    // merge:true → eyni doc varsa update edəcək (duplicate yox)
    bulkWriter.set(
      docRef,
      { rayon: r.rayon, adi: r.adi },
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
