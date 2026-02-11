# Cloudflare Tunnel Setup - Wildcard Route untuk Customer Subdomains

## Masalah

Customer subdomains seperti `lalaaliyaj.lumicloude.my.id` sudah ter-resolve ke Cloudflare Tunnel, tetapi website tidak bisa diakses karena tunnel belum dikonfigurasi untuk route traffic ke HestiaCP.

**Error**: `ERR_ADDRESS_UNREACHABLE`

## Solusi: Setup Wildcard Route (Sekali Setup, Semua Subdomain Otomatis Work!)

### Konfigurasi Saat Ini

- **Tunnel ID**: `208136fc-de2b-4173-b7e6-7e18577cb1e2`
- **Primary Domain**: `lumicloude.my.id`
- **HestiaCP Server**: `100.86.108.93` (Tailscale)
- **Apache Port**: `8080`

---

## 🚀 Cara Setup Wildcard Route

### Metode 1: Via Cloudflare Dashboard (Paling Mudah) ⭐

1. **Login ke Cloudflare Dashboard**

   ```
   https://dash.cloudflare.com
   ```

2. **Pilih Domain**
   - Klik domain: `lumicloude.my.id`

3. **Buka Zero Trust → Tunnels**
   - Klik menu **Zero Trust** di sidebar
   - Pilih **Access** → **Tunnels**
   - Klik pada tunnel Anda: `208136fc-de2b-4173-b7e6-7e18577cb1e2`

4. **Tambah Public Hostname**
   - Klik tab **"Public Hostname"**
   - Klik tombol **"Add a public hostname"**

5. **Isi Konfigurasi**

   ```
   Subdomain: *
   Domain: lumicloude.my.id
   Type: HTTP
   URL: 100.86.108.93:8080
   ```

   **Penjelasan**:
   - `*` = Wildcard, artinya SEMUA subdomain (customer1, customer2, dll)
   - `lumicloude.my.id` = domain utama
   - `HTTP` = protocol (bukan HTTPS karena internal)
   - `100.86.108.93:8080` = IP Tailscale HestiaCP + port Apache

6. **Save**
   - Klik **"Save hostname"**

### ✅ Selesai!

Sekarang semua subdomain customer yang di-generate sistem akan **otomatis work** tanpa konfigurasi tambahan:

- ✅ `lalaaliyaj.lumicloude.my.id`
- ✅ `customer2.lumicloude.my.id`
- ✅ `customer3.lumicloude.my.id`
- ✅ Dan seterusnya...

---

## Metode 2: Via Config File (Alternatif)

Jika Anda punya akses SSH ke server yang menjalankan Cloudflare Tunnel:

1. **SSH ke Server**

   ```bash
   ssh root@100.86.108.93
   ```

2. **Edit Config Tunnel**

   ```bash
   nano /etc/cloudflared/config.yml
   ```

3. **Tambahkan Wildcard Route**

   **PENTING**: Pastikan config PERSIS seperti ini (hapus route lain yang konflik):

   ```yaml
   tunnel: 208136fc-de2b-4173-b7e6-7e18577cb1e2
   credentials-file: /root/.cloudflared/208136fc-de2b-4173-b7e6-7e18577cb1e2.json

   ingress:
     # Wildcard route untuk semua subdomain customer
     - hostname: "*.lumicloude.my.id"
       service: http://100.86.108.93:8080

     # Catch-all (required) - HARUS ada di paling bawah
     - service: http_status:404
   ```

   **Catatan**:
   - Jangan ada `originRequest` atau setting tambahan
   - Pastikan tidak ada route lain untuk `lumicloude.my.id` yang konflik
   - Wildcard `*.lumicloude.my.id` harus di atas catch-all

4. **Restart Tunnel**
   ```bash
   systemctl restart cloudflared
   ```

---

## 🧪 Cara Test

Setelah setup wildcard route, test apakah subdomain sudah bisa diakses:

```bash
# Test dari terminal
curl -I http://lalaaliyaj.lumicloude.my.id

# Atau buka di browser
http://lalaaliyaj.lumicloude.my.id
```

**Expected Result**: Website muncul atau setidaknya tidak error `ERR_ADDRESS_UNREACHABLE`

---

## 📋 Checklist Setup

- [ ] Login ke Cloudflare Dashboard
- [ ] Buka Zero Trust → Access → Tunnels
- [ ] Pilih tunnel ID: `208136fc-de2b-4173-b7e6-7e18577cb1e2`
- [ ] Tambah Public Hostname: `*.lumicloude.my.id` → `http://100.86.108.93:8080`
- [ ] Save configuration
- [ ] Test subdomain customer: `http://lalaaliyaj.lumicloude.my.id`
- [ ] Verify file manager bisa akses files via SFTP

---

## ❓ Troubleshooting

### Subdomain Menampilkan "Success! Your new web server is ready to use." (Default Apache Page)

**Gejala**:

- Subdomain customer sudah bisa diakses
- Tapi menampilkan default page "Success! Your new web server is ready to use."
- Bukan menampilkan index.html dari document root Hestia (`/home/{user}/web/{domain}/public_html/`)

**Penyebab**:
Cloudflare Tunnel tidak meneruskan **Host header** yang benar, sehingga Apache/Nginx tidak tahu virtual host mana yang harus digunakan dan menampilkan default page.

**Solusi**:

**Opsi 1: Tambahkan originRequest di Config File** (Recommended):

```yaml
tunnel: 208136fc-de2b-4173-b7e6-7e18577cb1e2
credentials-file: /root/.cloudflared/208136fc-de2b-4173-b7e6-7e18577cb1e2.json

ingress:
  - hostname: "*.lumicloude.my.id"
    service: http://100.86.108.93:8080
    originRequest:
      noTLSVerify: true
      # Preserve Host header agar Apache/Nginx tahu virtual host mana
      httpHostHeader: "" # Empty = use original hostname dari request
  - service: http_status:404
```

Restart tunnel:

```bash
ssh root@100.86.108.93 "systemctl restart cloudflared"
```

**Opsi 2: Gunakan Nginx Port 80 instead of Apache 8080**:

Ubah config tunnel dari port `8080` ke port `80`:

```yaml
ingress:
  - hostname: "*.lumicloude.my.id"
    service: http://100.86.108.93:80
```

**Opsi 3: Test Manual dengan curl**:

Cek apakah virtual host sudah benar di server:

```bash
# Test langsung ke server (harus work)
ssh root@100.86.108.93 "curl -H 'Host: akbar.lumicloude.my.id' http://localhost:8080"

# Harusnya tampil index.html dari /home/custakbar3ysd23/web/akbar.lumicloude.my.id/public_html/
```

Jika test manual work, berarti masalah di Cloudflare Tunnel configuration.

---

### Error: ERR_ADDRESS_UNREACHABLE atau Connection Failed

**Penyebab**: Cloudflare Tunnel route sudah dikonfigurasi tapi config Dashboard conflict dengan config file

**PENTING**: Cloudflare Tunnel bisa dikelola via **Dashboard** ATAU **Config File**, tapi TIDAK KEDUANYA!

Dashboard config akan **override** config file.

**Solusi A: Gunakan Config File Saja** (Recommended):

1. **Hapus semua Public Hostname dari Dashboard**:
   - Buka Zero Trust → Tunnels → hestia-tunnel
   - Tab "Public Hostname"
   - Hapus semua hostname yang ada
   - Biarkan kosong

2. **Verify config file sudah benar**:

   ```bash
   ssh root@100.86.108.93 "cat /etc/cloudflared/config.yml"
   ```

   Harus tampil:

   ```yaml
   tunnel: 208136fc-de2b-4173-b7e6-7e18577cb1e2
   credentials-file: /root/.cloudflared/208136fc-de2b-4173-b7e6-7e18577cb1e2.json

   ingress:
     - hostname: hestia.lumicloude.my.id
       service: http://100.86.108.93:8080
     - hostname: "*.lumicloude.my.id"
       service: http://100.86.108.93:8080
     - service: http_status:404
   ```

3. **Restart tunnel**:
   ```bash
   ssh root@100.86.108.93 "systemctl restart cloudflared"
   ```

**Solusi B: Gunakan Dashboard Saja**:

1. **Edit catch-all rule** di Dashboard:
   - Klik menu (3 titik) di catch-all rule
   - Edit
   - Ubah dari `http://100.86.108.93:80` ke service type `HTTP Status`
   - Status Code: `404`
   - Save

2. **Tunggu 1-2 menit** untuk propagasi

3. **Restart Cloudflare Tunnel** (jika via config file):

   ```bash
   # SSH ke server
   ssh root@100.86.108.93

   # Restart tunnel
   systemctl restart cloudflared

   # Check status
   systemctl status cloudflared
   ```

4. **Tunggu propagasi** (jika via Dashboard):
   - Setelah save wildcard route di dashboard, tunggu 1-2 menit
   - Cloudflare perlu apply konfigurasi baru
   - Refresh browser dan coba lagi

5. **Verify route aktif**:
   - Kembali ke Cloudflare Dashboard
   - Zero Trust → Tunnels → hestia-tunnel
   - Tab "Public Hostname"
   - Pastikan `*.lumicloude.my.id` muncul dengan status aktif

6. **Force clear DNS cache**:

   ```bash
   # macOS
   sudo dscacheutil -flushcache; sudo killall -HUP mDNSResponder

   # Atau coba dengan curl
   curl -H "Host: lalaaliyaj.lumicloude.my.id" http://100.86.108.93:8080
   ```

### Error: 522 Connection Timed Out

**Penyebab**: Tunnel tidak bisa reach HestiaCP server

**Solusi**:

1. Pastikan Tailscale connected:

   ```bash
   tailscale status
   ```

2. Cek Apache running di port 8080:

   ```bash
   netstat -tuln | grep 8080
   ```

3. Test local connection:
   ```bash
   curl -H "Host: lalaaliyaj.lumicloude.my.id" http://100.86.108.93:8080
   ```

### Error: 404 Not Found

**Penyebab**: Website belum dibuat di HestiaCP

**Solusi**: Website otomatis dibuat saat create customer di panel. Jika tidak ada, create manual:

```bash
v-add-web-domain custlalaaliyajo6 lalaaliyaj.lumicloude.my.id
```

### Website Muncul Tapi File Manager Kosong

**Penyebab**: SFTP connection issue

**Solusi**:

1. Cek SSH port 22 terbuka
2. Verify credentials di database
3. Check HestiaCP user exists:
   ```bash
   v-list-users
   ```

---

## 💡 Keuntungan Wildcard Route

✅ **Setup sekali**, semua subdomain work  
✅ **Tidak perlu** create DNS record manual setiap customer baru  
✅ **Tidak perlu** API call ke Cloudflare  
✅ **Simple** dan mudah maintenance  
✅ **Automatic** - sistem generate subdomain langsung bisa diakses

---

## 📝 Catatan Penting

1. **Wildcard DNS sudah configured**: Semua subdomain `*.lumicloude.my.id` sudah pointing ke tunnel
2. **Yang missing**: Tunnel route configuration ke HestiaCP
3. **Setelah setup**: Customer baru akan otomatis accessible tanpa konfigurasi tambahan
4. **File Manager**: Akan akses file via SFTP ke `/home/{username}/web/{subdomain}/public_html/`

---

## 🎯 Next Steps

1. ✅ Setup wildcard route di Cloudflare Dashboard (5 menit)
2. ✅ Test dengan subdomain existing: `lalaaliyaj.lumicloude.my.id`
3. ✅ Create customer baru dan verify subdomain langsung work
4. ✅ Enjoy automated customer creation! 🎉
