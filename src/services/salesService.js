const { getDb, getAdmin } = require("./firebaseService");

function toId(value) {
  return String(value || "").trim();
}

function toIsoDate(value) {
  if (!value) {
    return null;
  }

  if (value.toDate && typeof value.toDate === "function") {
    return value.toDate().toISOString();
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  return String(value);
}

async function createSale(payload) {
  const userId = toId(payload?.userId);
  const paidAmount = Number(payload?.paidAmount);
  const rawItems = Array.isArray(payload?.items) ? payload.items : [];

  if (!userId) {
    throw new Error("User tidak valid");
  }

  if (rawItems.length === 0) {
    throw new Error("Keranjang masih kosong");
  }

  const sanitizedItems = rawItems.map((item) => ({
    productId: toId(item?.productId),
    qty: Number(item?.qty)
  }));

  for (const item of sanitizedItems) {
    if (!item.productId) {
      throw new Error("Produk di keranjang tidak valid");
    }

    if (!Number.isInteger(item.qty) || item.qty <= 0) {
      throw new Error("Qty produk harus bilangan bulat lebih dari 0");
    }
  }

  const mergedItemMap = new Map();
  for (const item of sanitizedItems) {
    const currentQty = mergedItemMap.get(item.productId) || 0;
    mergedItemMap.set(item.productId, currentQty + item.qty);
  }

  const mergedItems = [...mergedItemMap.entries()].map(([productId, qty]) => ({
    productId,
    qty
  }));

  const db = getDb();
  const admin = getAdmin();
  const userRef = db.collection("users").doc(userId);

  let resultPayload = null;

  await db.runTransaction(async (transaction) => {
    const userSnapshot = await transaction.get(userRef);

    if (!userSnapshot.exists) {
      throw new Error("User tidak ditemukan");
    }

    const userData = userSnapshot.data() || {};
    let totalAmount = 0;
    const resolvedItems = [];

    for (const item of mergedItems) {
      const productRef = db.collection("products").doc(item.productId);
      const productSnapshot = await transaction.get(productRef);

      if (!productSnapshot.exists) {
        throw new Error("Ada produk yang tidak ditemukan");
      }

      const productData = productSnapshot.data() || {};
      const productPrice = Number(productData.price) || 0;
      const productName = productData.name || "Produk";

      const subtotal = productPrice * item.qty;
      totalAmount += subtotal;

      resolvedItems.push({
        productId: productRef.id,
        productName,
        price: productPrice,
        qty: item.qty,
        subtotal
      });
    }

    if (!Number.isInteger(paidAmount) || paidAmount < totalAmount) {
      throw new Error("Jumlah bayar kurang dari total belanja");
    }

    const changeAmount = paidAmount - totalAmount;
    const saleRef = db.collection("sales").doc();

    transaction.set(saleRef, {
      userId,
      cashier: userData.username || "unknown",
      totalAmount,
      paidAmount,
      changeAmount,
      itemCount: resolvedItems.length,
      items: resolvedItems.map((item) => ({
        productId: item.productId,
        productName: item.productName,
        price: item.price,
        qty: item.qty,
        subtotal: item.subtotal
      })),
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    resultPayload = {
      saleId: saleRef.id,
      totalAmount,
      paidAmount,
      changeAmount,
      itemCount: resolvedItems.length
    };
  });

  return resultPayload;
}

async function getRecentSales(limit = 8) {
  const safeLimit = Number.isInteger(limit) && limit > 0 ? limit : 8;
  const db = getDb();

  const querySnapshot = await db
    .collection("sales")
    .orderBy("createdAt", "desc")
    .limit(safeLimit)
    .get();

  return querySnapshot.docs.map((doc) => {
    const data = doc.data() || {};
    return {
      id: doc.id,
      totalAmount: Number(data.totalAmount) || 0,
      paidAmount: Number(data.paidAmount) || 0,
      changeAmount: Number(data.changeAmount) || 0,
      createdAt: toIsoDate(data.createdAt),
      cashier: data.cashier || "unknown"
    };
  });
}

module.exports = { createSale, getRecentSales };
