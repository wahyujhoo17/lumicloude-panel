# Cron Job Setup untuk Auto-Suspend Customers

## Deskripsi

Sistem ini secara otomatis akan melakukan suspend terhadap customer yang masa berlanganannya sudah habis (expired). Cron job akan berjalan setiap hari dan memeriksa customer yang `expiresAt` sudah terlewati.

**Update:** Sistem sekarang tidak hanya suspend user account, tetapi juga **menghapus konfigurasi web domain** milik customer tersebut secara otomatis menggunakan HestiaCP command `v-delete-web-domain`. Ini memastikan website benar-benar tidak dapat diakses saat customer di-suspend. Saat unsuspend, domain akan di-recreate kembali dengan command `v-add-web-domain`.

## Setup Cron Job

### 1. Generate CRON_SECRET

```bash
# Generate random secret token
openssl rand -base64 32
```

Tambahkan hasil generate ke file `.env`:

```env
CRON_SECRET="paste-hasil-generate-disini"
```

### 2. Setup Cron di Server

#### Untuk VPS/Server Linux

Buka crontab:

```bash
crontab -e
```

Tambahkan baris berikut (untuk berjalan setiap hari jam 2 pagi):

```bash
0 2 * * * curl -H "Authorization: Bearer YOUR_CRON_SECRET" https://yourdomain.com/api/cron/check-expired
```

Atau dengan logging:

```bash
0 2 * * * curl -H "Authorization: Bearer YOUR_CRON_SECRET" https://yourdomain.com/api/cron/check-expired >> /var/log/lumicloud-cron.log 2>&1
```

#### Untuk Vercel (Vercel Cron)

Tambahkan file `vercel.json` di root project:

```json
{
  "crons": [
    {
      "path": "/api/cron/check-expired",
      "schedule": "0 2 * * *"
    }
  ]
}
```

Update route untuk support Vercel Cron (sudah termasuk Bearer token auth):

- Vercel akan otomatis menambahkan `Authorization: Bearer <CRON_SECRET>` header

### 3. Setup di cPanel/HestiaCP

#### Dari HestiaCP Web Panel:

1. Login ke HestiaCP sebagai admin
2. Pergi ke **Cron Jobs**
3. Klik **Add Cron Job**
4. Isi form:
   - **Minute**: 0
   - **Hour**: 2
   - **Day**: \*
   - **Month**: \*
   - **Weekday**: \*
   - **Command**:
     ```bash
     curl -H "Authorization: Bearer YOUR_CRON_SECRET" https://yourdomain.com/api/cron/check-expired
     ```

### 4. Test Cron Job Manual

Test dengan curl:

```bash
curl -H "Authorization: Bearer YOUR_CRON_SECRET" \
     https://yourdomain.com/api/cron/check-expired
```

Test dari localhost:

```bash
curl -H "Authorization: Bearer YOUR_CRON_SECRET" \
     http://localhost:3000/api/cron/check-expired
```

Response sukses:

```json
{
  "success": true,
  "processed": 2,
  "results": [
    {
      "customerId": "clx123abc",
      "email": "customer@example.com",
      "success": true,
      "websitesSuspended": 3,
      "totalWebsites": 3
    }
  ],
  "timestamp": "2026-02-12T02:00:00.000Z"
}
```

## Cara Kerja

1. **Endpoint**: `/api/cron/check-expired`
2. **Method**: GET
3. **Authentication**: Bearer token (CRON_SECRET)

### Proses:

1. Cari semua customers dengan status `ACTIVE` dan `expiresAt < now()`
2. Untuk setiap customer yang expired:
   - **Suspend user account** via HestiaCP API `v-suspend-user`
   - **Suspend semua website/domain** via HestiaCP API `v-suspend-web-domain` untuk setiap domain
   - Update status di database menjadi `SUSPENDED`
   - Log aktivitas suspend ke tabel `activityLog`
3. Return hasil suspend (berapa yang berhasil/gagal, berapa website yang di-suspend)

## Monitoring

### Cek Log Activity

Semua aktivitas suspend dicatat di database table `activityLog`:

```sql
SELECT * FROM ActivityLog
WHERE action = 'suspend_customer'
ORDER BY createdAt DESC
LIMIT 20;
```

### Cek Customer yang Di-suspend

```sql
SELECT id, name, email, hestiaUsername, status, expiresAt
FROM Customer
WHERE status = 'SUSPENDED'
ORDER BY updatedAt DESC;
```

## Manual Suspend/Unsuspend

### Via UI Dashboard

1. Pergi ke **Dashboard > Customers**
2. Klik menu 3 titik (...) pada customer
3. Pilih **Suspend** atau **Unsuspend**
4. Sistem akan suspend/unsuspend:
   - User account di HestiaCP
   - **Semua website/domain** milik customer tersebut
5. Toast notification akan muncul dengan hasil

### Via API

**Suspend:**

```bash
curl -X POST https://yourdomain.com/api/customers/CUSTOMER_ID/suspend \
  -H "Content-Type: application/json" \
  -H "Cookie: your-session-cookie"
```

Response:

```json
{
  "success": true,
  "message": "Customer and all websites suspended successfully",
  "websiteResults": [
    {
      "domain": "example.lumicloude.my.id",
      "success": true
    }
  ]
}
```

**Unsuspend:**

```bash
curl -X DELETE https://yourdomain.com/api/customers/CUSTOMER_ID/suspend \
  -H "Content-Type: application/json" \
  -H "Cookie: your-session-cookie"
```

## Troubleshooting

### Cron Job Tidak Berjalan

1. Pastikan CRON_SECRET di `.env` sudah benar
2. Cek cron log: `grep CRON /var/log/syslog`
3. Test manual dengan curl
4. Pastikan domain/URL bisa diakses dari server

### Customer Tidak Tersuspend / Website Masih Hidup

1. Cek HestiaCP credentials sudah benar
2. Cek HestiaCP admin user punya permission untuk suspend
3. **Pastikan command `v-suspend-web-domain` dipanggil untuk setiap domain**
4. Cek log error di console/logs
5. Test manual suspend via HestiaCP web panel
6. Verifikasi dengan command manual:

   ```bash
   # Suspend domain
   v-suspend-web-domain USERNAME DOMAIN yes

   # Cek status domain
   v-list-web-domains USERNAME json
   ```

### Website Masih Bisa Diakses Setelah Suspend

**Penyebab:** Hanya user account yang di-suspend, tetapi web domain tidak di-suspend

**Solusi:** Update sistem sekarang sudah otomatis suspend web domain. Pastikan:

- API endpoint memanggil `suspendWebDomain()` untuk setiap website
- HestiaCP command `v-suspend-web-domain` berhasil dijalankan
- Restart web server jika perlu: parameter `yes` di command

### Error "Unauthorized"

- Pastikan Bearer token di header sesuai dengan CRON_SECRET
- Format header: `Authorization: Bearer <token>`

### Error HestiaCP API

- Cek HESTIA_HOST, HESTIA_PORT, HESTIA_USER bisa diakses
- Test command manual:
  ```bash
  curl "https://HESTIA_HOST:HESTIA_PORT/api/?user=HESTIA_USER&password=HESTIA_PASSWORD&returncode=yes&cmd=v-suspend-user&arg1=USERNAME"
  ```

## Keamanan

⚠️ **Penting:**

- CRON_SECRET harus dijaga kerahasiaannya
- Jangan commit CRON_SECRET ke git
- Gunakan HTTPS untuk production
- Rotate secret secara berkala

## Schedule Recommendations

| Waktu                    | Cron Expression | Keterangan     |
| ------------------------ | --------------- | -------------- |
| Setiap hari jam 2 pagi   | `0 2 * * *`     | Recommended    |
| Setiap hari jam 12 malam | `0 0 * * *`     | Alternative    |
| Setiap 6 jam             | `0 */6 * * *`   | Frequent check |
| Setiap Senin jam 3 pagi  | `0 3 * * 1`     | Weekly         |

**Recommended**: Jam 2-3 pagi karena traffic rendah.

## Notifikasi Email (Future Enhancement)

Untuk mengirim email notifikasi sebelum suspend, tambahkan:

1. Setup SMTP credentials di `.env`
2. Create email template untuk warning
3. Send email 7 hari sebelum expired
4. Send email 1 hari sebelum expired
5. Send email saat suspended

Contoh implementasi ada di `TODO_EMAIL_NOTIFICATIONS.md`
