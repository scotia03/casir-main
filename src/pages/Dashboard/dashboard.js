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
const addProductAvailableBody = document.getElementById("addProductAvailableBody");
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
const sidebarBackdrop = document.getElementById("sidebarBackdrop");
const sidebarToggleBtn = document.getElementById("sidebarToggleBtn");
const sidebarCloseBtn = document.getElementById("sidebarCloseBtn");
const salesList = document.getElementById("salesList");
const downloadSalesBtn = document.getElementById("downloadSalesBtn");
const salesSearchInput = document.getElementById("salesSearchInput");
const salesSearchResetBtn = document.getElementById("salesSearchResetBtn");
const salesSearchInfoEl = document.getElementById("salesSearchInfo");
const productStatusEl = document.getElementById("productStatus");
const addProductListStatusEl = document.getElementById("addProductListStatus");
const checkoutStatusEl = document.getElementById("checkoutStatus");
const navButtons = document.querySelectorAll("[data-nav-target]");
const featurePanels = document.querySelectorAll(".featurePanel");

let products = [];
let cart = [];
let allSales = [];
let filteredSales = [];

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

function isMobileViewport() {
  return window.matchMedia("(max-width: 920px)").matches;
}

function setSidebarOpen(isOpen) {
  document.body.classList.toggle("sidebar-open", isOpen);
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

  if (isMobileViewport()) {
    setSidebarOpen(false);
  }
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
  addProductAvailableBody.innerHTML = "";

  const availableProducts = products.filter((product) => !product.isOutOfStock);
  const outOfStockProducts = products.filter((product) => product.isOutOfStock);

  if (availableProducts.length === 0) {
    productAvailableBody.innerHTML = `
      <tr>
        <td colspan="3">Belum ada produk aktif</td>
      </tr>
    `;
    addProductAvailableBody.innerHTML = `
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

    const addSectionRows = availableProducts
      .map((product) => {
        return `
          <tr>
            <td>${product.name}</td>
            <td>${formatCurrency(product.price)}</td>
            <td>
              <button class="btnDanger" data-action="delete-product" data-product-id="${product.id}">
                Hapus
              </button>
            </td>
          </tr>
        `;
      })
      .join("");

    addProductAvailableBody.innerHTML = addSectionRows;
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
    salesList.innerHTML = `
      <tr>
        <td colspan="5">Belum ada transaksi</td>
      </tr>
    `;
    return;
  }

  const rows = sales
    .map((sale) => {
      const dateText = formatSalesDate(sale.createdAt);
      return `
        <tr>
          <td>${sale.id}</td>
          <td>${sale.cashier || "unknown"}</td>
          <td>${Number(sale.itemCount) || 0}</td>
          <td>${formatCurrency(sale.totalAmount)}</td>
          <td>${dateText}</td>
        </tr>
      `;
    })
    .join("");

  salesList.innerHTML = rows;
}

function normalizeSearch(value) {
  return String(value || "").trim().toLowerCase();
}

function formatSalesDate(value) {
  return value ? new Date(value).toLocaleString("id-ID") : "-";
}

function applySalesFilter() {
  const keyword = normalizeSearch(salesSearchInput ? salesSearchInput.value : "");

  filteredSales = allSales.filter((sale) => {
    if (!keyword) {
      return true;
    }

    const searchable = [
      sale.id,
      sale.cashier || "unknown",
      formatSalesDate(sale.createdAt),
      String(Number(sale.totalAmount) || 0),
      String(Number(sale.itemCount) || 0)
    ]
      .join(" ")
      .toLowerCase();

    return searchable.includes(keyword);
  });

  renderSales(filteredSales);
  renderSalesSearchInfo(keyword);
}

function renderSalesSearchInfo(keyword) {
  if (!salesSearchInfoEl) {
    return;
  }

  if (!allSales.length) {
    salesSearchInfoEl.innerText = "Belum ada data transaksi.";
    return;
  }

  if (!keyword) {
    salesSearchInfoEl.innerText = `Menampilkan ${filteredSales.length} transaksi terbaru.`;
    return;
  }

  salesSearchInfoEl.innerText = `Hasil pencarian "${keyword}": ${filteredSales.length} transaksi ditemukan.`;
}

async function loadRecentSales() {
  const sales = await api.getRecentSales(1000);
  allSales = sales;
  applySalesFilter();
}

function createSalesRowsForExport(sales) {
  return sales.map((sale, index) => ({
    no: index + 1,
    id: sale.id,
    dateText: sale.createdAt ? new Date(sale.createdAt).toLocaleString("id-ID") : "-",
    cashier: sale.cashier || "unknown",
    itemCount: Number(sale.itemCount) || 0,
    totalAmount: Number(sale.totalAmount) || 0,
    paidAmount: Number(sale.paidAmount) || 0,
    changeAmount: Number(sale.changeAmount) || 0
  }));
}

function escapeCsvCell(value) {
  const normalized = String(value ?? "").replace(/"/g, "\"\"");
  return `"${normalized}"`;
}

function createSalesCsvContent(sales) {
  const rowsForExport = createSalesRowsForExport(sales);
  const headers = [
    "No",
    "ID Transaksi",
    "Tanggal",
    "Kasir",
    "Jumlah Item",
    "Total Belanja",
    "Jumlah Bayar",
    "Kembalian"
  ];

  const rows = rowsForExport.map((sale) => {
    return [
      sale.no,
      sale.id,
      sale.dateText,
      sale.cashier || "unknown",
      sale.itemCount,
      sale.totalAmount,
      sale.paidAmount,
      sale.changeAmount
    ]
      .map(escapeCsvCell)
      .join(",");
  });

  return [headers.map(escapeCsvCell).join(","), ...rows].join("\n");
}

function getTimestampToken() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const hh = String(now.getHours()).padStart(2, "0");
  const min = String(now.getMinutes()).padStart(2, "0");
  return `${yyyy}${mm}${dd}-${hh}${min}`;
}

function getSalesFilename(extension = "xlsx") {
  return `riwayat-transaksi-${getTimestampToken()}.${extension}`;
}

function downloadBlobFile(filename, blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function downloadTextFile(filename, content, mimeType = "text/csv;charset=utf-8;") {
  const blob = new Blob([content], { type: mimeType });
  downloadBlobFile(filename, blob);
}

function getSalesSummaryRows(rowsForExport) {
  const totalSales = rowsForExport.length;
  const totalItemCount = rowsForExport.reduce((sum, row) => sum + row.itemCount, 0);
  const totalAmount = rowsForExport.reduce((sum, row) => sum + row.totalAmount, 0);
  const totalPaidAmount = rowsForExport.reduce((sum, row) => sum + row.paidAmount, 0);
  const totalChangeAmount = rowsForExport.reduce((sum, row) => sum + row.changeAmount, 0);

  return [
    ["Laporan Transaksi Kasir"],
    ["Dibuat Pada", new Date().toLocaleString("id-ID")],
    [],
    ["Jumlah Transaksi", totalSales],
    ["Total Item Terjual", totalItemCount],
    ["Total Omzet", totalAmount],
    ["Total Pembayaran", totalPaidAmount],
    ["Total Kembalian", totalChangeAmount]
  ];
}

function applySheetNumberFormat(sheet, columnLetter, rowStart, rowEnd, numberFormat) {
  for (let row = rowStart; row <= rowEnd; row += 1) {
    const cellAddress = `${columnLetter}${row}`;
    if (sheet[cellAddress]) {
      sheet[cellAddress].z = numberFormat;
    }
  }
}

function exportSalesAsExcel(sales) {
  if (!window.XLSX) {
    throw new Error("Library Excel belum termuat");
  }

  const XLSX = window.XLSX;
  const rowsForExport = createSalesRowsForExport(sales);

  const detailHeaders = [
    "No",
    "ID Transaksi",
    "Tanggal",
    "Kasir",
    "Jumlah Item",
    "Total Belanja",
    "Jumlah Bayar",
    "Kembalian"
  ];

  const detailRows = rowsForExport.map((row) => [
    row.no,
    row.id,
    row.dateText,
    row.cashier,
    row.itemCount,
    row.totalAmount,
    row.paidAmount,
    row.changeAmount
  ]);

  const detailSheet = XLSX.utils.aoa_to_sheet([detailHeaders, ...detailRows]);
  detailSheet["!cols"] = [
    { wch: 6 },
    { wch: 24 },
    { wch: 24 },
    { wch: 18 },
    { wch: 12 },
    { wch: 16 },
    { wch: 16 },
    { wch: 14 }
  ];

  if (detailRows.length > 0) {
    detailSheet["!autofilter"] = { ref: `A1:H${detailRows.length + 1}` };
    applySheetNumberFormat(detailSheet, "E", 2, detailRows.length + 1, "0");
    applySheetNumberFormat(detailSheet, "F", 2, detailRows.length + 1, "#,##0");
    applySheetNumberFormat(detailSheet, "G", 2, detailRows.length + 1, "#,##0");
    applySheetNumberFormat(detailSheet, "H", 2, detailRows.length + 1, "#,##0");
  }

  const summarySheet = XLSX.utils.aoa_to_sheet(getSalesSummaryRows(rowsForExport));
  summarySheet["!cols"] = [{ wch: 24 }, { wch: 22 }];
  applySheetNumberFormat(summarySheet, "B", 4, 8, "#,##0");

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, summarySheet, "Ringkasan");
  XLSX.utils.book_append_sheet(workbook, detailSheet, "Transaksi");

  const workbookBytes = XLSX.write(workbook, {
    bookType: "xlsx",
    type: "array",
    compression: true
  });

  const excelBlob = new Blob([workbookBytes], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  });

  downloadBlobFile(getSalesFilename("xlsx"), excelBlob);
}

async function handleDownloadSales() {
  if (!api) {
    setStatus(checkoutStatusEl, "API aplikasi tidak tersedia", "error");
    return;
  }

  try {
    const keyword = normalizeSearch(salesSearchInput ? salesSearchInput.value : "");
    const sales = keyword ? filteredSales : allSales;

    if (!sales || sales.length === 0) {
      if (keyword) {
        setStatus(checkoutStatusEl, "Tidak ada hasil pencarian untuk diunduh", "error");
        return;
      }

      setStatus(checkoutStatusEl, "Belum ada transaksi untuk diunduh", "error");
      return;
    }

    if (window.XLSX) {
      exportSalesAsExcel(sales);
      setStatus(checkoutStatusEl, "File Excel transaksi berhasil diunduh", "success");
      return;
    }

    const csvBody = createSalesCsvContent(sales);
    const csvWithBom = `\uFEFF${csvBody}`;
    downloadTextFile(getSalesFilename("csv"), csvWithBom);
    setStatus(
      checkoutStatusEl,
      "Library Excel belum termuat, file CSV diunduh sebagai fallback",
      "success"
    );
  } catch (error) {
    setStatus(checkoutStatusEl, error.message || "Gagal mengunduh transaksi", "error");
  }
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

async function deleteProductFallbackWeb(productId) {
  if (!window.firebase || !window.firebase.firestore) {
    throw new Error("Fitur hapus belum aktif. Coba refresh atau deploy ulang.");
  }

  const productRef = window.firebase.firestore().collection("products").doc(productId);
  const productDoc = await productRef.get();

  if (!productDoc.exists) {
    throw new Error("Produk tidak ditemukan");
  }

  await productRef.delete();
  return { id: productId };
}

async function deleteProduct(productId) {
  if (!api) {
    setStatus(addProductListStatusEl, "API aplikasi tidak tersedia", "error");
    return;
  }

  const product = products.find((item) => item.id === productId);
  const productName = product ? product.name : "produk ini";
  const confirmed = window.confirm(`Hapus "${productName}" dari daftar produk?`);

  if (!confirmed) {
    return;
  }

  try {
    if (typeof api.deleteProduct === "function") {
      await api.deleteProduct(productId);
    } else {
      await deleteProductFallbackWeb(productId);
    }

    cart = cart.filter((item) => item.id !== productId);
    setStatus(addProductListStatusEl, "Produk berhasil dihapus", "success");
    await loadProducts();
  } catch (error) {
    setStatus(addProductListStatusEl, error.message || "Gagal menghapus produk", "error");
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
    return;
  }

  if (action === "delete-product") {
    deleteProduct(productId);
  }
}

productAvailableBody.addEventListener("click", handleProductAction);
productOutOfStockBody.addEventListener("click", handleProductAction);
addProductAvailableBody.addEventListener("click", handleProductAction);

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
sidebarToggleBtn.addEventListener("click", () => {
  const isOpen = document.body.classList.contains("sidebar-open");
  setSidebarOpen(!isOpen);
});
sidebarCloseBtn.addEventListener("click", () => setSidebarOpen(false));
sidebarBackdrop.addEventListener("click", () => setSidebarOpen(false));
window.addEventListener("resize", () => {
  if (!isMobileViewport()) {
    setSidebarOpen(false);
  }
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    setSidebarOpen(false);
    setCartDrawerOpen(false);
  }
});

navButtons.forEach((button) => {
  button.addEventListener("click", handleSidebarNavClick);
});
if (downloadSalesBtn) {
  downloadSalesBtn.addEventListener("click", handleDownloadSales);
}
if (salesSearchInput) {
  salesSearchInput.addEventListener("input", applySalesFilter);
}
if (salesSearchResetBtn) {
  salesSearchResetBtn.addEventListener("click", () => {
    if (!salesSearchInput) {
      return;
    }

    salesSearchInput.value = "";
    applySalesFilter();
  });
}

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
