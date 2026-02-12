# Deploy ke Vercel (Web Mode)

Project ini bisa diakses publik lewat browser dengan mode web (bukan Electron runtime).

## 1. Prasyarat
- Firestore aktif di project Firebase.
- Rules Firestore sudah dipublish.
- Koleksi minimal:
  - `users`
  - `products`
  - `sales`

## 2. Deploy
1. Push project ke GitHub.
2. Di Vercel, klik `Add New Project`.
3. Pilih repository ini.
4. Framework: `Other`.
5. Build command: kosongkan.
6. Output directory: kosongkan.
7. Klik `Deploy`.

## 3. Routing
`vercel.json` sudah mengarahkan root URL (`/`) ke:
- `/src/pages/login/login.html`

## 4. Catatan
- Mode web memakai Firebase client SDK dari browser.
- Electron app (`npm start`) tetap bisa dipakai seperti biasa.

## 5. push dan update vercel
git add .
git commit -m "fix: vercel routing and deployment updates"
git push origin main
