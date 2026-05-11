// Force redeploy - Update 4
const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

// Master şifrə yalnız burada — server tərəfindədir, frontend-ə çatmır
const REPORT_DELETE_MASTER_PASSWORD = "202420252026";

async function assertAdmin(data, context) {
  let callerUid = context?.auth?.uid;

  // Əgər context.auth işləmirsə, manual token ilə yoxla
  if (!callerUid && data?.token) {
    try {
      const decoded = await admin.auth().verifyIdToken(data.token);
      callerUid = decoded.uid;
    } catch (e) {
      throw new functions.https.HttpsError("unauthenticated", "Token etibarsızdır.");
    }
  }

  if (!callerUid) {
    throw new functions.https.HttpsError("unauthenticated", "Login olunmayıb.");
  }

  const callerDoc = await admin.firestore().collection("users").doc(callerUid).get();
  const role = callerDoc.exists ? callerDoc.data().role : null;

  if (role !== "admin") {
    throw new functions.https.HttpsError("permission-denied", "Yalnız admin icazəlidir.");
  }

  return callerUid;
}

// Admin yeni user yaradır: Auth + Firestore users/{uid}
exports.createUserByAdmin = functions.https.onCall(async (data, context) => {
  console.log("createUserByAdmin triggered. Data:", JSON.stringify({ email: data?.email, role: data?.role }));
  await assertAdmin(data, context);

  const email = String(data?.email || "").trim().toLowerCase();
  const password = String(data?.password || "").trim();
  const role = String(data?.role || "istifadəçi").trim();

  if (!email || !email.includes("@")) {
    throw new functions.https.HttpsError("invalid-argument", "Email düzgün deyil.");
  }
  if (!password || password.length < 6) {
    throw new functions.https.HttpsError("invalid-argument", "Parol ən azı 6 simvol olmalıdır.");
  }
  if (!["admin", "subadmin", "istifadəçi", "mtm_user", "school_user", "mekteb_monitor"].includes(role)) {
    throw new functions.https.HttpsError("invalid-argument", "Rol düzgün deyil: " + role);
  }

  let userRecord;
  try {
    userRecord = await admin.auth().createUser({
      email,
      password,
      emailVerified: false,
      disabled: false,
    });
  } catch (e) {
    throw new functions.https.HttpsError("already-exists", e?.message || "İstifadəçi yaradıla bilmədi.");
  }

  await admin.firestore().collection("users").doc(userRecord.uid).set(
    {
      email,
      role,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  return { uid: userRecord.uid, email, role };
});

// Admin istifadəçini silir: Auth + Firestore users/{uid}
exports.deleteUserByAdmin = functions.https.onCall(async (data, context) => {
  await assertAdmin(data, context);

  const uid = String(data?.uid || "").trim();
  if (!uid) {
    throw new functions.https.HttpsError("invalid-argument", "UID göndərilməyib.");
  }

  // Auth-dan sil
  try {
    await admin.auth().deleteUser(uid);
  } catch (e) {
    // Əgər Auth-da artıq yoxdursa, sadəcə keç
    if (e.code !== "auth/user-not-found") {
      throw new functions.https.HttpsError("internal", e.message);
    }
  }

  // Firestore-dan sil
  await admin.firestore().collection("users").doc(uid).delete();

  return { success: true, uid };
});

// Hesabatı master şifrə ilə silir — şifrə yalnız server tərəfindədir
exports.deleteReportByAdmin = functions.https.onCall(async (data, context) => {
  await assertAdmin(data, context);

  const reportId = String(data?.reportId || "").trim();
  const password = String(data?.password || "").trim();
  const col = String(data?.collection || "newMonitorinqHesabatlari").trim();

  if (!reportId) {
    throw new functions.https.HttpsError("invalid-argument", "Report ID göndərilməyib.");
  }

  if (password !== REPORT_DELETE_MASTER_PASSWORD) {
    throw new functions.https.HttpsError("permission-denied", "Master şifrə yanlışdır!");
  }

  const allowedCollections = ["newMonitorinqHesabatlari", "newMektebMonitorinqHesabatlari"];
  if (!allowedCollections.includes(col)) {
    throw new functions.https.HttpsError("invalid-argument", "Etibarsız kolleksiya.");
  }

  await admin.firestore().collection(col).doc(reportId).delete();

  return { success: true, reportId };
});
