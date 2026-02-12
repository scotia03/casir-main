(function bootstrapDashboard() {
const user = JSON.parse(localStorage.getItem("user"));

if (!user) {
  window.location.href = "../login/login.html";
  return;
}

document.getElementById("userInfo").innerText = `Login sebagai: ${user.username} (${user.role})`;

const productForm = document.getElementById("productForm");
const productAvailableBody = document.getElementById("productAvailableBody");
const productOutOfStockBody = document.getElementById("productOutOfStockBody");
const productListStatusEl = document.getElementById("productListStatus");
const cartBody = document.getElementById("cartBody");
const cartTotalEl = document.getElementById("cartTotal");
const paidAmountDisplayEl = document.getElementById("paidAmountDisplay");
const checkoutBtn = document.getElementById("checkoutBtn");
const cartFab = document.getElementById("cartFab");
const cartFabCount = document.getElementById("cartFabCount");
const cartDrawer = document.getElementById("cartDrawer");
const cartBackdrop = document.getElementById("cartBackdrop");
const closeCartBtn = document.getElementById("closeCartBtn");
const salesList = document.getElementById("salesList");
const productStatusEl = document.getElementById("productStatus");
const checkoutStatusEl = document.getElementById("checkoutStatus");
const navButtons = document.querySelectorAll("[data-nav-target]");
const featurePanels = document.querySelectorAll(".featurePanel");

let products = [];
let cart = [];

function getApi() {
  if (window.api) {
    return window.api;
  }

  if (window.electronAPI) {
    return window.electronAPI;
  }

  return null;
}

const api = getApi();

if (!api) {
  setStatus(checkoutStatusEl, "API aplikasi tidak tersedia. Jalankan lewat Electron.", "error");
}

function formatCurrency(value) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0
  }).format(value || 0);
}

let toastTimer = null;

function getToastEl() {
  let toastEl = document.getElementById("appToast");

  if (!toastEl) {
    toastEl = document.createElement("div");
    toastEl.id = "appToast";
    toastEl.className = "toast";
    document.body.appendChild(toastEl);
  }

  return toastEl;
}

function showToast(message, type = "info", duration = 2800) {
  if (!message) {
    return;
  }

  const toastEl = getToastEl();
  toastEl.className = `toast ${type}`;
  toastEl.innerText = message;
  toastEl.classList.remove("show");
  // Force reflow so repeated messages still animate.
  void toastEl.offsetHeight;
  toastEl.classList.add("show");

  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toastEl.classList.remove("show");
  }, duration);
}

function setStatus(_target, message = "", type = "info") {
  showToast(message, type);
}

function setCartDrawerOpen(isOpen) {
  cartDrawer.classList.toggle("open", isOpen);
  cartBackdrop.classList.toggle("open", isOpen);
}

function handleSidebarNavClick(event) {
  const button = event.currentTarget;
  const targetId = button.dataset.navTarget;
  const targetSection = document.getElementById(targetId);

  if (!targetSection) {
    return;
  }

  navButtons.forEach((navButton) => navButton.classList.remove("active"));
  button.classList.add("active");
  featurePanels.forEach((panel) => panel.classList.remove("active"));
  targetSection.classList.add("active");
}

function getTotal() {
  return cart.reduce((total, item) => total + item.price * item.qty, 0);
}

function syncCartWithProducts() {
  const productMap = new Map(products.map((product) => [product.id, product]));

  cart = cart
    .map((item) => {
      const freshProduct = productMap.get(item.id);
      if (!freshProduct || freshProduct.isOutOfStock) {
        return null;
      }

      return {
        ...item,
        name: freshProduct.name,
        price: freshProduct.price
      };
    })
    .filter(Boolean);
}

function renderProducts() {
  productAvailableBody.innerHTML = "";
  productOutOfStockBody.innerHTML = "";

  const availableProducts = products.filter((product) => !product.isOutOfStock);
  const outOfStockProducts = products.filter((product) => product.isOutOfStock);

  if (availableProducts.length === 0) {
    productAvailableBody.innerHTML = `
      <tr>
        <td colspan="3">Belum ada produk aktif</td>
      </tr>
    `;
  } else {
    const availableRows = availableProducts
      .map((product) => {
        return `
          <tr>
            <td>${product.name}</td>
            <td>${formatCurrency(product.price)}</td>
            <td>
              <div class="actionRow">
                <button data-action="add-to-cart" data-product-id="${product.id}">Tambah</button>
                <button class="btnWarn" data-action="mark-out-of-stock" data-product-id="${product.id}">Stok Habis</button>
              </div>
            </td>
          </tr>
        `;
      })
      .join("");

    productAvailableBody.innerHTML = availableRows;
  }

  if (outOfStockProducts.length === 0) {
    productOutOfStockBody.innerHTML = `
      <tr>
        <td colspan="3">Belum ada produk di stok kosong</td>
      </tr>
    `;
    return;
  }

  const outOfStockRows = outOfStockProducts
    .map((product) => {
      return `
        <tr>
          <td>${product.name}</td>
          <td>${formatCurrency(product.price)}</td>
          <td>
            <button class="btnRestore" data-action="mark-in-stock" data-product-id="${product.id}">
              Aktifkan Lagi
            </button>
          </td>
        </tr>
      `;
    })
    .join("");

  productOutOfStockBody.innerHTML = outOfStockRows;
}

function renderCart() {
  cartBody.innerHTML = "";
  const totalQty = cart.reduce((sum, item) => sum + item.qty, 0);
  cartFabCount.innerText = String(totalQty);

  if (cart.length === 0) {
    cartBody.innerHTML = `<p class="cartEmpty">Keranjang masih kosong</p>`;
    cartTotalEl.innerText = formatCurrency(0);
    paidAmountDisplayEl.innerText = formatCurrency(0);
    checkoutBtn.disabled = true;
    return;
  }

  const items = cart
    .map((item) => {
      const subtotal = item.price * item.qty;
      return `
        <div class="cartItem">
          <div class="cartItemRow">
            <div class="cartItemInfo">
              <div class="cartItemTitle">${item.name}</div>
              <div class="cartItemMeta">${formatCurrency(item.price)} x ${item.qty} = ${formatCurrency(subtotal)}</div>
            </div>
            <div class="cartItemActions">
              <button data-action="decrease" data-product-id="${item.id}">-</button>
              <span class="cartQty">${item.qty}</span>
              <button data-action="increase" data-product-id="${item.id}">+</button>
            </div>
          </div>
        </div>
      `;
    })
    .join("");

  cartBody.innerHTML = items;
  const total = getTotal();
  cartTotalEl.innerText = formatCurrency(total);
  paidAmountDisplayEl.innerText = formatCurrency(total);
  checkoutBtn.disabled = false;
}

async function loadProducts() {
  products = await api.getProducts();
  syncCartWithProducts();
  renderProducts();
  renderCart();
}

function renderSales(sales) {
  salesList.innerHTML = "";

  if (!sales || sales.length === 0) {
    salesList.innerHTML = "<li>Belum ada transaksi</li>";
    return;
  }

  const items = sales
    .map((sale) => {
      const dateText = sale.createdAt ? new Date(sale.createdAt).toLocaleString("id-ID") : "-";
      return `
        <li>
          #${sale.id} - ${formatCurrency(sale.totalAmount)} - ${sale.cashier || "unknown"} - ${dateText}
        </li>
      `;
    })
    .join("");

  salesList.innerHTML = items;
}

async function loadRecentSales() {
  const sales = await api.getRecentSales(8);
  renderSales(sales);
}

async function setOutOfStockState(productId, isOutOfStock) {
  if (!api) {
    setStatus(productListStatusEl, "API aplikasi tidak tersedia", "error");
    return;
  }

  try {
    await api.setProductOutOfStock(productId, isOutOfStock);

    if (isOutOfStock) {
      cart = cart.filter((item) => item.id !== productId);
      setStatus(productListStatusEl, "Produk dipindahkan ke stok kosong", "success");
    } else {
      setStatus(productListStatusEl, "Produk dikembalikan ke daftar aktif", "success");
    }

    await loadProducts();
  } catch (error) {
    setStatus(productListStatusEl, error.message || "Gagal mengubah status stok", "error");
  }
}

function addToCart(productId) {
  const product = products.find((item) => item.id === productId);
  if (!product) {
    return;
  }

  if (product.isOutOfStock) {
    setStatus(productListStatusEl, `Produk ${product.name} ada di stok kosong`, "error");
    return;
  }

  const existing = cart.find((item) => item.id === productId);
  if (existing) {
    existing.qty += 1;
  } else {
    cart.push({
      id: product.id,
      name: product.name,
      price: product.price,
      qty: 1
    });
  }

  setStatus(productListStatusEl);
  setStatus(checkoutStatusEl);
  renderCart();
}

function updateCartQty(productId, type) {
  const item = cart.find((entry) => entry.id === productId);
  if (!item) {
    return;
  }

  if (type === "increase") {
    item.qty += 1;
  }

  if (type === "decrease") {
    item.qty -= 1;
    if (item.qty <= 0) {
      cart = cart.filter((entry) => entry.id !== productId);
    }
  }

  setStatus(checkoutStatusEl);
  renderCart();
}

async function handleAddProduct(event) {
  event.preventDefault();

  if (!api) {
    setStatus(productStatusEl, "API aplikasi tidak tersedia", "error");
    return;
  }

  const payload = {
    name: document.getElementById("productName").value,
    price: Number(document.getElementById("productPrice").value)
  };

  try {
    await api.createProduct(payload);
    setStatus(productStatusEl, "Produk berhasil ditambahkan", "success");
    productForm.reset();
    await loadProducts();
  } catch (error) {
    setStatus(productStatusEl, error.message || "Gagal menambah produk", "error");
  }
}

async function handleCheckout() {
  if (!api) {
    setStatus(checkoutStatusEl, "API aplikasi tidak tersedia", "error");
    return;
  }

  if (cart.length === 0) {
    setStatus(checkoutStatusEl, "Keranjang masih kosong", "error");
    return;
  }

  const total = getTotal();
  const paidAmount = total;

  const payload = {
    userId: user.id,
    paidAmount,
    items: cart.map((item) => ({
      productId: item.id,
      qty: item.qty
    }))
  };

  try {
    const result = await api.createSale(payload);
    setStatus(
      checkoutStatusEl,
      `Transaksi #${result.saleId} berhasil. Kembalian: ${formatCurrency(result.changeAmount)}`,
      "success"
    );

    cart = [];

    await loadProducts();
    await loadRecentSales();
  } catch (error) {
    setStatus(checkoutStatusEl, error.message || "Checkout gagal", "error");
  }
}

document.getElementById("logout").addEventListener("click", () => {
  localStorage.removeItem("user");
  window.location.href = "../login/login.html";
});

productForm.addEventListener("submit", handleAddProduct);

function handleProductAction(event) {
  const trigger = event.target.closest("button");
  if (!trigger) {
    return;
  }

  const action = trigger.dataset.action;
  const productId = String(trigger.dataset.productId || "").trim();
  if (!productId) {
    return;
  }

  if (action === "add-to-cart") {
    addToCart(productId);
    return;
  }

  if (action === "mark-out-of-stock") {
    setOutOfStockState(productId, true);
    return;
  }

  if (action === "mark-in-stock") {
    setOutOfStockState(productId, false);
  }
}

productAvailableBody.addEventListener("click", handleProductAction);
productOutOfStockBody.addEventListener("click", handleProductAction);

cartBody.addEventListener("click", (event) => {
  const trigger = event.target.closest("button");
  if (!trigger) {
    return;
  }

  const action = trigger.dataset.action;
  const productId = String(trigger.dataset.productId || "").trim();

  if (!productId) {
    return;
  }

  updateCartQty(productId, action);
});

checkoutBtn.addEventListener("click", handleCheckout);
cartFab.addEventListener("click", () => {
  const isOpen = cartDrawer.classList.contains("open");
  setCartDrawerOpen(!isOpen);
});
closeCartBtn.addEventListener("click", () => setCartDrawerOpen(false));
cartBackdrop.addEventListener("click", () => setCartDrawerOpen(false));

navButtons.forEach((button) => {
  button.addEventListener("click", handleSidebarNavClick);
});

async function init() {
  checkoutBtn.disabled = true;

  if (!api) {
    return;
  }

  try {
    await loadProducts();
    await loadRecentSales();
  } catch (error) {
    setStatus(checkoutStatusEl, "Gagal memuat data dashboard", "error");
  }
}

init();
})();
