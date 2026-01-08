const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

async function assertAdmin(context) {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Login olunmayıb.");
  }

  const callerUid = context.auth.uid;
  const callerDoc = await admin.firestore().collection("users").doc(callerUid).get();
  const role = callerDoc.exists ? callerDoc.data().role : null;

  if (role !== "admin") {
    throw new functions.https.HttpsError("permission-denied", "Yalnız admin icazəlidir.");
  }
}

// Admin yeni user yaradır: Auth + Firestore users/{uid}
exports.createUserByAdmin = functions.https.onCall(async (data, context) => {
  await assertAdmin(context);

  const email = String(data?.email || "").trim().toLowerCase();
  const password = String(data?.password || "").trim();
  const role = String(data?.role || "istifadəçi").trim();

  if (!email || !email.includes("@")) {
    throw new functions.https.HttpsError("invalid-argument", "Email düzgün deyil.");
  }
  if (!password || password.length < 6) {
    throw new functions.https.HttpsError("invalid-argument", "Parol ən azı 6 simvol olmalıdır.");
  }
  if (!["admin", "subadmin", "istifadəçi"].includes(role)) {
    throw new functions.https.HttpsError("invalid-argument", "Rol düzgün deyil.");
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
