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

function setStatus(message = "", type = "info") {
  showToast(message, type);
}

function getApi() {
  if (window.api && typeof window.api.register === "function") {
    return window.api;
  }

  if (window.electronAPI && typeof window.electronAPI.register === "function") {
    return window.electronAPI;
  }

  return null;
}

async function handleRegister() {
  const api = getApi();
  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value;
  const confirmPassword = document.getElementById("confirmPassword").value;

  setStatus();

  if (!api) {
    setStatus("API aplikasi tidak tersedia. Tutup lalu jalankan ulang Electron.", "error");
    return;
  }

  if (!username || !password || !confirmPassword) {
    setStatus("Semua field wajib diisi", "error");
    return;
  }

  if (password !== confirmPassword) {
    setStatus("Konfirmasi password tidak sama", "error");
    return;
  }

  try {
    await api.register({
      username,
      password,
      role: "cashier"
    });

    setStatus("Registrasi berhasil. Mengarahkan ke halaman login...", "success");
    setTimeout(() => {
      window.location.href = "../login/login.html";
    }, 1000);
  } catch (error) {
    setStatus(error.message || "Registrasi gagal", "error");
  }
}

document.getElementById("registerBtn").addEventListener("click", handleRegister);
document.getElementById("backToLoginBtn").addEventListener("click", () => {
  window.location.href = "../login/login.html";
});

document.getElementById("confirmPassword").addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    handleRegister();
  }
});

if (!getApi()) {
  setStatus("Mode browser terdeteksi. Buka halaman ini lewat aplikasi Electron.", "error");
}
