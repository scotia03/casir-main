const { getDb, getAdmin } = require("./firebaseService");

function normalizeUsername(username) {
  return String(username || "").trim().toLowerCase();
}

async function login(username, password) {
  const normalizedUsername = normalizeUsername(username);
  const normalizedPassword = String(password || "").trim();

  if (!normalizedUsername || !normalizedPassword) {
    return null;
  }

  const db = getDb();
  const querySnapshot = await db
    .collection("users")
    .where("usernameLower", "==", normalizedUsername)
    .limit(1)
    .get();

  if (querySnapshot.empty) {
    return null;
  }

  const doc = querySnapshot.docs[0];
  const data = doc.data();

  if (String(data.password || "") !== normalizedPassword) {
    return null;
  }

  return {
    id: doc.id,
    username: data.username,
    role: data.role || "cashier"
  };
}

async function register(payload) {
  const username = String(payload?.username || "").trim();
  const password = String(payload?.password || "").trim();
  const role = "cashier";
  const usernameLower = normalizeUsername(username);

  if (username.length < 3) {
    throw new Error("Username minimal 3 karakter");
  }

  if (password.length < 6) {
    throw new Error("Password minimal 6 karakter");
  }

  const db = getDb();

  const existingUser = await db
    .collection("users")
    .where("usernameLower", "==", usernameLower)
    .limit(1)
    .get();

  if (!existingUser.empty) {
    throw new Error("Username sudah digunakan");
  }

  const admin = getAdmin();
  const docRef = await db.collection("users").add({
    username,
    usernameLower,
    password,
    role,
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  });

  return {
    id: docRef.id,
    username,
    role
  };
}

module.exports = { login, register };
