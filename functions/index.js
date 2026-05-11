// Force redeploy - Update 3
const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

async function assertAdmin(data, context) {
  let callerUid = context?.auth?.uid;
  console.log("assertAdmin started. context.auth.uid:", callerUid);
  console.log("data.token present?:", !!data?.token);

  if (!callerUid && data?.token) {
    try {
      const decoded = await admin.auth().verifyIdToken(data.token);
      callerUid = decoded.uid;
      console.log("Token verified successfully. UID:", callerUid);
    } catch (e) {
      console.error("Token verification failed:", e);
      throw new functions.https.HttpsError("unauthenticated", "Təqdim edilən token etibarsızdır.");
    }
  }

  if (!callerUid) {
    console.error("No callerUid found. Throwing Login olunmayib.");
    throw new functions.https.HttpsError("unauthenticated", "Login olunmayıb.");
  }

  const callerDoc = await admin.firestore().collection("users").doc(callerUid).get();
  const role = callerDoc.exists ? callerDoc.data().role : null;
  console.log("Caller role:", role);

  if (role !== "admin") {
    console.error("Caller is not admin. Role is:", role);
    throw new functions.https.HttpsError("permission-denied", "Yalnız admin icazəlidir.");
  }
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
