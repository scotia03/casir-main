const { getDb, getAdmin } = require("./firebaseService");

function normalizeProductName(name) {
  return String(name || "").trim().toLowerCase();
}

async function getProducts() {
  const db = getDb();
  const querySnapshot = await db.collection("products").orderBy("name").get();

  return querySnapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      name: data.name,
      price: Number(data.price) || 0,
      isOutOfStock: Boolean(data.isOutOfStock)
    };
  });
}

async function createProduct(payload) {
  const name = String(payload?.name || "").trim();
  const price = Number(payload?.price);
  const nameLower = normalizeProductName(name);

  if (!name) {
    throw new Error("Nama produk wajib diisi");
  }

  if (!Number.isInteger(price) || price <= 0) {
    throw new Error("Harga produk harus bilangan bulat lebih dari 0");
  }

  const db = getDb();

  const existingProduct = await db
    .collection("products")
    .where("nameLower", "==", nameLower)
    .limit(1)
    .get();

  if (!existingProduct.empty) {
    throw new Error("Nama produk sudah ada");
  }

  const admin = getAdmin();
  const docRef = await db.collection("products").add({
    name,
    nameLower,
    price,
    isOutOfStock: false,
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  });

  return {
    id: docRef.id,
    name,
    price,
    isOutOfStock: false
  };
}

async function setProductOutOfStock(productId, isOutOfStock) {
  const targetProductId = String(productId || "").trim();

  if (!targetProductId) {
    throw new Error("Produk tidak valid");
  }

  const nextStatus = Boolean(isOutOfStock);
  const db = getDb();
  const admin = getAdmin();
  const productRef = db.collection("products").doc(targetProductId);
  const productDoc = await productRef.get();

  if (!productDoc.exists) {
    throw new Error("Produk tidak ditemukan");
  }

  await productRef.update({
    isOutOfStock: nextStatus,
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  });

  return {
    id: targetProductId,
    isOutOfStock: nextStatus
  };
}

module.exports = { getProducts, createProduct, setProductOutOfStock };
