const admin = require("firebase-admin");
const xlsx = require("xlsx");
const path = require("path");

// Layihənizin kök qovluğundakı serviceAccountKey.json faylını göstəririk
const serviceAccount = require("../serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();
const auth = admin.auth();

// Excel faylının adı (bu script ilə eyni qovluqda olmalıdır)
const EXCEL_FILE = path.join(__dirname, "users_import.xlsx");

async function importUsers() {
  console.log("📂 Excel faylı oxunur:", EXCEL_FILE);

  let workbook;
  try {
    workbook = xlsx.readFile(EXCEL_FILE);
  } catch (e) {
    console.error("❌ Excel faylı tapılmadı:", EXCEL_FILE);
    process.exit(1);
  }

  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const rows = xlsx.utils.sheet_to_json(worksheet, { header: 1 });

  // Başlıq sətirini keç (1-ci sətir)
  const dataRows = rows.slice(1).filter((row) => row[3]); // D sütunu (Email) mütləq olmalıdır

  console.log(`\n👥 ${dataRows.length} istifadəçi tapıldı. İmport başlayır...\n`);

  let successCount = 0;
  let updatedCount = 0;
  let errorCount = 0;

  // Mövcud istifadəçiləri yoxla
  const usersSnap = await db.collection("users").get();
  const existingMap = new Map();
  usersSnap.forEach((doc) => {
    const email = doc.data().email?.toLowerCase();
    if (email) existingMap.set(email, doc.id);
  });

  for (const row of dataRows) {
    const assignedRegions = row[0]
      ? String(row[0])
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : [];
    const fullName = row[1] ? String(row[1]).trim() : "";
    const position = row[2] ? String(row[2]).trim() : "";
    const email = String(row[3]).trim().toLowerCase();
    const password = row[4] ? String(row[4]).trim() : "Mutda2025!"; // Default şifrə
    const role = row[5] ? String(row[5]).trim() : "mtm_user";
    const viewScope = row[6] ? String(row[6]).trim() : "own";

    if (!email.includes("@")) {
      console.warn(`  ⚠️  Keçilir (Email yanlışdır): ${email}`);
      errorCount++;
      continue;
    }
    if (password.length < 6) {
      console.warn(`  ⚠️  Keçilir (Şifrə qısadır): ${email}`);
      errorCount++;
      continue;
    }

    const existingUid = existingMap.get(email);

    try {
      if (existingUid) {
        // Mövcud istifadəçini yalnız Firestore-da yenilə
        await db.collection("users").doc(existingUid).set(
          {
            fullName,
            position,
            assignedRegions,
            viewScope,
            role,
          },
          { merge: true }
        );
        console.log(`  🔄 Yeniləndi: ${email}`);
        updatedCount++;
      } else {
        // Yeni istifadəçi yarat
        let uid;
        try {
          const userRecord = await auth.createUser({
            email,
            password,
            emailVerified: false,
            disabled: false,
          });
          uid = userRecord.uid;
        } catch (e) {
          if (e.code === "auth/email-already-exists") {
            // Auth-da var, amma Firestore-da yoxdur — UID-ni tapıb yeniləyirik
            const existingUser = await auth.getUserByEmail(email);
            uid = existingUser.uid;
          } else {
            throw e;
          }
        }

        await db
          .collection("users")
          .doc(uid)
          .set(
            {
              email,
              role,
              fullName,
              position,
              assignedRegions,
              viewScope,
              isFirstLogin: true,
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
            },
            { merge: true }
          );

        console.log(`  ✅ Yaradıldı: ${email}`);
        successCount++;
      }
    } catch (err) {
      console.error(`  ❌ Xəta [${email}]:`, err.message);
      errorCount++;
    }
  }

  console.log("\n=============================");
  console.log(`✅ Yeni yaradılan: ${successCount}`);
  console.log(`🔄 Yenilənən:      ${updatedCount}`);
  console.log(`❌ Xəta:           ${errorCount}`);
  console.log("=============================\n");

  process.exit(0);
}

importUsers().catch((err) => {
  console.error("Kritik xəta:", err);
  process.exit(1);
});
