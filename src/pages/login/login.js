function getApi() {
  if (window.api && typeof window.api.login === "function") {
    return window.api;
  }

  if (window.electronAPI && typeof window.electronAPI.login === "function") {
    return window.electronAPI;
  }

  return null;
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

async function handleLogin() {
  const api = getApi();
  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;

  if (!api) {
    showToast("API aplikasi tidak tersedia. Jalankan halaman dari Electron.", "error", 3600);
    return;
  }

  if (!username || !password) {
    showToast("Username dan password wajib diisi", "error");
    return;
  }

  try {
    const user = await api.login(username, password);

    if (!user) {
      showToast("Username atau password salah", "error");
    } else {
      localStorage.setItem("user", JSON.stringify(user));
      window.location.href = "../Dashboard/dashboard.html";
    }
  } catch (error) {
    showToast(error.message || "Terjadi kesalahan saat login", "error", 3600);
  }
}

document.getElementById("loginBtn").addEventListener("click", handleLogin);
document.getElementById("goRegisterBtn").addEventListener("click", () => {
  window.location.href = "../register/register.html";
});

document.getElementById("password").addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    handleLogin();
  }
});

if (!getApi()) {
  showToast("Mode browser terdeteksi. Buka login dari aplikasi Electron.", "error", 4000);
}
