const admin = require("firebase-admin");
const path = require("path");
const fs = require("fs");

const serviceAccountPath = path.join(__dirname, "..", "serviceAccountKey.json");

if (!fs.existsSync(serviceAccountPath)) {
  console.error("serviceAccountKey.json tapılmadı:", serviceAccountPath);
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(require(serviceAccountPath)),
});

const db = admin.firestore();

async function main() {
  const reportsRef = db.collection("newMonitorinqHesabatlari");
  const snapshot = await reportsRef.get();
  
  const bulkWriter = db.bulkWriter();
  let updatedCount = 0;

  snapshot.docs.forEach((doc) => {
    const data = doc.data();
    // Əgər regionalIdare boşdursa və ya yoxdursa, Bakı Şəhəri üzrə Təhsil İdarəsi kimi təyin edək
    if (!data.regionalIdare) {
      bulkWriter.update(doc.ref, { regionalIdare: "Bakı Şəhəri üzrə Təhsil İdarəsi" });
      updatedCount++;
    }
  });

  bulkWriter.onWriteResult((docRef) => {
      // ignore
  });
  
  bulkWriter.onWriteError((error) => {
    console.error("Write error:", error);
    return false;
  });

  await bulkWriter.close();
  console.log(`Miqrasiya tamamlandı! Cəmi ${updatedCount} köhnə hesabat "Bakı Şəhəri üzrə Təhsil İdarəsi" olaraq yeniləndi.`);
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
