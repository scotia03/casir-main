# Setup Firebase & Firestore Rules

Project ini saat ini memakai Firebase Web SDK (`firebase/compat`) dari aplikasi Electron.

## 1. Aktifkan Firestore
1. Buka Firebase Console project `casir-mian`.
2. Pastikan Cloud Firestore sudah dibuat (mode Native).
3. Pastikan Firestore API sudah aktif.

## 2. Pilih Rules Yang Dipakai

Ada 2 file rules di repo ini:

1. `firestore.rules.current-app`
Tujuan: kompatibel dengan arsitektur login aplikasi saat ini.
Catatan: ini lebih aman dari `allow read, write: if true`, tapi belum ideal untuk production karena masih memakai password di dokumen `users`.

2. `firestore.rules.production`
Tujuan: production yang lebih aman.
Catatan: file ini mengharuskan Firebase Authentication (`request.auth`) dan struktur user per `uid`. Jika langsung dipakai sekarang, login aplikasi saat ini akan gagal sampai auth flow dimigrasi.

## 3. Cara Apply Rules Di Console
1. Buka tab `Firestore Database -> Rules`.
2. Copy isi file rules yang dipilih.
3. Paste ke editor Rules.
4. Klik `Publish`.

## 4. Koleksi Yang Digunakan Aplikasi
- `users`
- `products`
- `sales`
