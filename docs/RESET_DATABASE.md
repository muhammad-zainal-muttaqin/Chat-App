# Reset Database - Hapus Semua Data

## Cara 1: Via Convex Dashboard (Paling Mudah)

1. Buka https://dashboard.convex.dev
2. Pilih project Anda
3. Masuk ke tab **Functions**
4. Cari fungsi `reset:resetDatabase`
5. Klik **Run** → **Run with no arguments**
6. Konfirmasi

## Cara 2: Via Convex CLI

```bash
# Set environment ke production (jika belum)
npx convex deploy

# Panggil fungsi reset
npx convex run reset:resetDatabase
```

## Cara 3: Via Code (Development)

Buat file script sederhana untuk memanggil fungsi:

```typescript
// reset-db.ts (temporary file)
import { ConvexHttpClient } from "convex/browser";
import { api } from "./convex/_generated/api";

const client = new ConvexHttpClient(process.env.VITE_CONVEX_URL!);
await client.mutation(api.reset.resetDatabase, {});
console.log("Database reset complete!");
```

Lalu jalankan:
```bash
bun run reset-db.ts
```

## Apa yang Dihapus?

Fungsi `resetDatabase` akan menghapus:
- ✅ Semua messages
- ✅ Semua conversations  
- ✅ Semua sessions
- ✅ Semua users

**PERINGATAN**: Tindakan ini tidak bisa di-undo! Semua data akan hilang permanen.

## Setelah Reset

Setelah reset, Anda perlu:
1. Register user baru
2. Generate encryption keys baru
3. Mulai dari awal
