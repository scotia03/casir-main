(function bootstrapWebApi() {
  if (window.api && typeof window.api.login === "function") {
    return;
  }

  function buildError(message) {
    return new Error(message || "Terjadi kesalahan");
  }

  function getFirebaseApp() {
    if (!window.firebase) {
      throw buildError("Firebase SDK belum termuat di browser.");
    }

    const firebaseConfig = {
      apiKey: "AIzaSyDrkGREhmSgQq-Ifey3shhVeMZ2ewYxiAY",
      authDomain: "casir-mian.firebaseapp.com",
      projectId: "casir-mian",
      storageBucket: "casir-mian.firebasestorage.app",
      messagingSenderId: "1033788963934",
      appId: "1:1033788963934:web:09dea7b44674fe8ca588cf",
      measurementId: "G-Z3TEZ5J4FB"
    };

    if (window.firebase.apps.length > 0) {
      return window.firebase.app();
    }

    return window.firebase.initializeApp(firebaseConfig);
  }

  function getDb() {
    getFirebaseApp();
    return window.firebase.firestore();
  }

  function normalize(value) {
    return String(value || "").trim();
  }

  function normalizeLower(value) {
    return normalize(value).toLowerCase();
  }

  async function login(username, password) {
    const usernameLower = normalizeLower(username);
    const normalizedPassword = normalize(password);

    if (!usernameLower || !normalizedPassword) {
      return null;
    }

    const db = getDb();
    const snapshot = await db
      .collection("users")
      .where("usernameLower", "==", usernameLower)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return null;
    }

    const doc = snapshot.docs[0];
    const data = doc.data() || {};

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
    const username = normalize(payload && payload.username);
    const password = normalize(payload && payload.password);
    const usernameLower = normalizeLower(username);
    const role = "cashier";

    if (username.length < 3) {
      throw buildError("Username minimal 3 karakter");
    }

    if (password.length < 6) {
      throw buildError("Password minimal 6 karakter");
    }

    const db = getDb();
    const existing = await db
      .collection("users")
      .where("usernameLower", "==", usernameLower)
      .limit(1)
      .get();

    if (!existing.empty) {
      throw buildError("Username sudah digunakan");
    }

    const docRef = await db.collection("users").add({
      username,
      usernameLower,
      password,
      role,
      createdAt: window.firebase.firestore.FieldValue.serverTimestamp()
    });

    return {
      id: docRef.id,
      username,
      role
    };
  }

  async function getProducts() {
    const db = getDb();
    const snapshot = await db.collection("products").orderBy("name").get();

    return snapshot.docs.map((doc) => {
      const data = doc.data() || {};
      return {
        id: doc.id,
        name: data.name,
        price: Number(data.price) || 0,
        isOutOfStock: Boolean(data.isOutOfStock)
      };
    });
  }

  async function createProduct(payload) {
    const name = normalize(payload && payload.name);
    const price = Number(payload && payload.price);
    const nameLower = normalizeLower(name);

    if (!name) {
      throw buildError("Nama produk wajib diisi");
    }

    if (!Number.isInteger(price) || price <= 0) {
      throw buildError("Harga produk harus bilangan bulat lebih dari 0");
    }

    const db = getDb();
    const existing = await db
      .collection("products")
      .where("nameLower", "==", nameLower)
      .limit(1)
      .get();

    if (!existing.empty) {
      throw buildError("Nama produk sudah ada");
    }

    const docRef = await db.collection("products").add({
      name,
      nameLower,
      price,
      isOutOfStock: false,
      createdAt: window.firebase.firestore.FieldValue.serverTimestamp()
    });

    return {
      id: docRef.id,
      name,
      price,
      isOutOfStock: false
    };
  }

  async function setProductOutOfStock(productId, isOutOfStock) {
    const targetProductId = normalize(productId);
    if (!targetProductId) {
      throw buildError("Produk tidak valid");
    }

    const db = getDb();
    const ref = db.collection("products").doc(targetProductId);
    const doc = await ref.get();

    if (!doc.exists) {
      throw buildError("Produk tidak ditemukan");
    }

    await ref.update({
      isOutOfStock: Boolean(isOutOfStock),
      updatedAt: window.firebase.firestore.FieldValue.serverTimestamp()
    });

    return {
      id: targetProductId,
      isOutOfStock: Boolean(isOutOfStock)
    };
  }

  async function createSale(payload) {
    const userId = normalize(payload && payload.userId);
    const paidAmount = Number(payload && payload.paidAmount);
    const rawItems = Array.isArray(payload && payload.items) ? payload.items : [];

    if (!userId) {
      throw buildError("User tidak valid");
    }

    if (rawItems.length === 0) {
      throw buildError("Keranjang masih kosong");
    }

    const sanitizedItems = rawItems.map((item) => ({
      productId: normalize(item && item.productId),
      qty: Number(item && item.qty)
    }));

    sanitizedItems.forEach((item) => {
      if (!item.productId) {
        throw buildError("Produk di keranjang tidak valid");
      }

      if (!Number.isInteger(item.qty) || item.qty <= 0) {
        throw buildError("Qty produk harus bilangan bulat lebih dari 0");
      }
    });

    const mergedMap = new Map();
    sanitizedItems.forEach((item) => {
      const current = mergedMap.get(item.productId) || 0;
      mergedMap.set(item.productId, current + item.qty);
    });

    const mergedItems = Array.from(mergedMap.entries()).map(([productId, qty]) => ({
      productId,
      qty
    }));

    const db = getDb();
    const userRef = db.collection("users").doc(userId);
    let responsePayload = null;

    await db.runTransaction(async (transaction) => {
      const userDoc = await transaction.get(userRef);
      if (!userDoc.exists) {
        throw buildError("User tidak ditemukan");
      }

      const userData = userDoc.data() || {};
      let totalAmount = 0;
      const resolvedItems = [];

      for (const item of mergedItems) {
        const productRef = db.collection("products").doc(item.productId);
        const productDoc = await transaction.get(productRef);
        if (!productDoc.exists) {
          throw buildError("Ada produk yang tidak ditemukan");
        }

        const productData = productDoc.data() || {};
        if (productData.isOutOfStock) {
          throw buildError("Ada produk yang sedang stok kosong");
        }

        const price = Number(productData.price) || 0;
        const subtotal = price * item.qty;
        totalAmount += subtotal;

        resolvedItems.push({
          productId: productRef.id,
          productName: productData.name || "Produk",
          price,
          qty: item.qty,
          subtotal
        });
      }

      if (!Number.isInteger(paidAmount) || paidAmount < totalAmount) {
        throw buildError("Jumlah bayar kurang dari total belanja");
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
        items: resolvedItems,
        createdAt: window.firebase.firestore.FieldValue.serverTimestamp()
      });

      responsePayload = {
        saleId: saleRef.id,
        totalAmount,
        paidAmount,
        changeAmount,
        itemCount: resolvedItems.length
      };
    });

    return responsePayload;
  }

  async function getRecentSales(limit) {
    const safeLimit = Number.isInteger(limit) && limit > 0 ? limit : 8;
    const db = getDb();
    const snapshot = await db
      .collection("sales")
      .orderBy("createdAt", "desc")
      .limit(safeLimit)
      .get();

    return snapshot.docs.map((doc) => {
      const data = doc.data() || {};
      const createdAt = data.createdAt && data.createdAt.toDate
        ? data.createdAt.toDate().toISOString()
        : null;

      return {
        id: doc.id,
        totalAmount: Number(data.totalAmount) || 0,
        paidAmount: Number(data.paidAmount) || 0,
        changeAmount: Number(data.changeAmount) || 0,
        createdAt,
        cashier: data.cashier || "unknown"
      };
    });
  }

  const webApi = {
    login,
    register,
    getProducts,
    createProduct,
    setProductOutOfStock,
    createSale,
    getRecentSales
  };

  window.api = webApi;
  window.electronAPI = webApi;
})();
