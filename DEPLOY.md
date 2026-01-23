# Panduan Deploy

## 1. Deploy Convex Backend

```bash
npx convex deploy
```

Ini akan:
- Deploy semua fungsi Convex ke production
- Generate production URL (akan ditampilkan setelah deploy)
- Simpan URL tersebut untuk langkah berikutnya

**Catatan**: Setelah deploy, Anda akan mendapat production URL seperti:
```
https://your-project-name.convex.cloud
```

## 2. Setup Environment Variable di Vercel

Setelah deploy Convex, copy production URL dan set sebagai environment variable di Vercel:

**Variable Name**: `VITE_CONVEX_URL`
**Value**: `https://your-project-name.convex.cloud`

## 3. Deploy Frontend ke Vercel

### Opsi A: Via CLI (Cepat)

```bash
# Install Vercel CLI (jika belum)
bun add -g vercel

# Deploy
vercel

# Atau untuk production
vercel --prod
```

### Opsi B: Via Vercel Dashboard (Recommended)

1. Buka https://vercel.com
2. Login dengan GitHub/GitLab/Bitbucket
3. Klik "Add New Project"
4. Import repository Chat-App
5. Vercel akan auto-detect Vite
6. **PENTING**: Tambahkan environment variable:
   - Name: `VITE_CONVEX_URL`
   - Value: (URL dari Convex production)
7. Klik "Deploy"

## 4. Verifikasi

Setelah deploy:
- Frontend: https://your-project.vercel.app
- Convex Dashboard: https://dashboard.convex.dev

## Troubleshooting

- **Build error**: Pastikan semua dependencies terinstall (`bun install`)
- **Environment variable tidak terdeteksi**: Pastikan nama variable `VITE_CONVEX_URL` (harus prefix `VITE_`)
- **Convex connection error**: Pastikan URL di environment variable benar
