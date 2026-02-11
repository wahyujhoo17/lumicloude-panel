# Customer Domain Setup Guide

## 📋 Overview

This guide documents the complete workflow for setting up customer websites using their own custom domains with LumiCloud's infrastructure. The setup leverages Cloudflare Tunnel, Tailscale VPN, HestiaCP, and aaPanel DNS for a scalable, secure hosting solution.

## 🏗️ Architecture

```
Customer Domain (example.com)
       ↓
CNAME: www → customer1.lumicloude.my.id
       ↓
DNS A Record: customer1 → 198.41.192.67 (Cloudflare Edge)
       ↓
Cloudflare Tunnel (208136fc-de2b-4173-b7e6-7e18577cb1e2)
       ↓
Tailscale VPN Network
       ↓
Home Server (100.86.108.93:8080)
       ↓
Apache Web Server
       ↓
HestiaCP Virtual Host
       ↓
Customer Website
```

## 🔧 Technical Components

| Component               | Details                                                      |
| ----------------------- | ------------------------------------------------------------ |
| **Cloudflare Tunnel**   | v2026.2.0, Tunnel ID: `208136fc-de2b-4173-b7e6-7e18577cb1e2` |
| **Tailscale IP**        | 100.86.108.93 (Home Server)                                  |
| **HestiaCP**            | Port 8083, Control Panel                                     |
| **Apache**              | Port 8080, Web Server                                        |
| **aaPanel DNS**         | VPS: 178.239.117.17:14400                                    |
| **Primary Domain**      | lumicloude.my.id                                             |
| **Cloudflare Edge IPs** | 198.41.192.67, 198.41.200.193, 198.41.192.107                |

## 📦 Prerequisites (One-Time Setup)

✅ These are already configured and **DO NOT** need to be repeated for each customer:

### 1. Cloudflare Tunnel Configuration

```yaml
# /etc/cloudflared/config.yml
tunnel: 208136fc-de2b-4173-b7e6-7e18577cb1e2
credentials-file: /root/.cloudflared/208136fc-de2b-4173-b7e6-7e18577cb1e2.json

ingress:
  - hostname: "*.lumicloude.my.id"
    service: http://100.86.108.93:8080
  - service: http_status:404
```

**Key Features:**

- ✨ Wildcard hostname (`*.lumicloude.my.id`) handles unlimited subdomains
- 🔒 No port forwarding required on home router
- 🌐 Routes traffic through Cloudflare's global network

### 2. Cloudflare Dashboard Settings

- **Ingress Rule**: `*.lumicloude.my.id` → `http://100.86.108.93:8080`
- **DNS**: Wildcard CNAME → `208136fc-de2b-4173-b7e6-7e18577cb1e2.cfargotunnel.com`

### 3. aaPanel DNS Zone

Domain: `lumicloude.my.id`

```
Type    Name    Value
NS      @       ns1.lumicloude.my.id
NS      @       ns2.lumicloude.my.id
A       ns1     178.239.117.17
A       ns2     178.239.117.17
A       hestia  198.41.192.67
```

## 🚀 Customer Onboarding Workflow

### Total Time: ~7 minutes per customer

---

### Step 1: Create Subdomain in HestiaCP (5 minutes)

1. **Access HestiaCP Panel**

   ```
   URL: https://100.86.108.93:8083
   or via Cloudflare: https://hestia.lumicloude.my.id
   ```

2. **Add New Website**
   - Navigate to: **Web** → **Add Web Domain**
   - Domain: `customer1.lumicloude.my.id` (choose unique subdomain)
   - Enable SSL: ✅ (Let's Encrypt automatic)
   - Enable PHP: ✅
   - Database: Optional (create if customer needs WordPress/Laravel)

3. **Configure Aliases**
   - Edit domain settings
   - Add aliases: `www.customer1.lumicloude.my.id`, `example.com`, `www.example.com`
   - This allows customer's domain to work seamlessly

4. **Upload Website Files**
   - Via SFTP: `/home/username/web/customer1.lumicloude.my.id/public_html/`
   - Or use HestiaCP File Manager

---

### Step 2: Create DNS Record in aaPanel (2 minutes)

1. **Access aaPanel DNS Manager**

   ```
   URL: https://178.239.117.17:14400
   ```

2. **Add A Record**
   - Zone: `lumicloude.my.id`
   - Type: `A`
   - Name: `customer1` (subdomain prefix)
   - Value: `198.41.192.67` (Cloudflare Edge IP)
   - TTL: `600` (10 minutes for faster propagation)

3. **Verify DNS Propagation**

   ```bash
   # Check if DNS is working
   dig customer1.lumicloude.my.id +short
   # Should return: 198.41.192.67

   # Test with curl
   curl -I https://customer1.lumicloude.my.id
   # Should return: HTTP/2 200 or 302
   ```

---

### Step 3: Customer CNAME Setup (Customer Action)

**Send these instructions to your customer:**

---

## 📧 Customer Instructions Template

### How to Point Your Domain to LumiCloud

Thank you for choosing LumiCloud! To connect your custom domain, follow these simple steps:

#### Option 1: Using www subdomain (Recommended)

1. Log in to your domain registrar's control panel
2. Go to DNS settings for `example.com`
3. Add/Edit these records:

```
Type     Name    Value                          TTL
CNAME    www     customer1.lumicloude.my.id     Auto/3600
CNAME    @       customer1.lumicloude.my.id     Auto/3600
```

**Note:** Some registrars don't allow CNAME on root domain (@). If you see an error:

- Use CNAME for `www` only
- Add A record for `@` pointing to: `198.41.192.67`

#### Option 2: Root domain with A record

```
Type     Name    Value              TTL
A        @       198.41.192.67      3600
A        www     198.41.192.67      3600
```

#### Common Registrar Instructions

**Cloudflare:**

1. Dashboard → Domain → DNS
2. Add Record → Type: CNAME, Name: www, Target: customer1.lumicloude.my.id
3. Proxy Status: DNS Only (grey cloud, NOT orange)

**Namecheap:**

1. Domain List → Manage → Advanced DNS
2. Add Record → CNAME, Host: www, Value: customer1.lumicloude.my.id

**GoDaddy:**

1. My Products → DNS → Manage Zones
2. Add → CNAME, Name: www, Value: customer1.lumicloude.my.id

**Niagahoster:**

1. Layanan Saya → Kelola → DNS Management
2. Tambah Record → CNAME, Host: www, Nilai: customer1.lumicloude.my.id

#### Verification (5-60 minutes after setup)

```bash
# Check DNS propagation
nslookup www.example.com

# Should show:
# www.example.com canonical name = customer1.lumicloude.my.id
# Address: 198.41.192.67
```

Your website will be live at:

- ✅ https://www.example.com
- ✅ https://example.com (if both records added)
- ✅ https://customer1.lumicloude.my.id (always works)

**Propagation Time:** 5-60 minutes (sometimes up to 24 hours globally)

---

## 🔍 Troubleshooting Guide

### Issue 1: DNS Not Resolving

**Symptoms:** `dig` returns no results or wrong IP

**Solutions:**

```bash
# 1. Check aaPanel DNS record exists
dig @178.239.117.17 customer1.lumicloude.my.id

# 2. Verify nameservers
dig lumicloude.my.id NS +short
# Should show: ns1.lumicloude.my.id, ns2.lumicloude.my.id

# 3. Check Cloudflare Tunnel status
sudo systemctl status cloudflared
# Should be: active (running)

# 4. Clear local DNS cache
# macOS:
sudo dscacheutil -flushcache && sudo killall -HUP mDNSResponder

# Linux:
sudo systemd-resolve --flush-caches

# Chrome:
# Visit: chrome://net-internals/#dns → Clear host cache
```

---

### Issue 2: SSL Certificate Error

**Symptoms:** "Your connection is not private" or ERR_CERT_COMMON_NAME_INVALID

**Causes & Solutions:**

| Cause                           | Solution                                                                 | Time    |
| ------------------------------- | ------------------------------------------------------------------------ | ------- |
| Let's Encrypt not issued yet    | Wait for automatic issuance                                              | 2-5 min |
| Domain not in HestiaCP aliases  | Add domain to Web → Edit → Aliases                                       | 1 min   |
| Customer using Cloudflare proxy | Set to DNS Only (grey cloud)                                             | Instant |
| Certificate renewal failed      | SSH: `sudo v-update-letsencrypt-ssl username customer1.lumicloude.my.id` | 1 min   |

**Check SSL status:**

```bash
# View certificate details
openssl s_client -connect customer1.lumicloude.my.id:443 -servername customer1.lumicloude.my.id < /dev/null | openssl x509 -noout -text

# Should show: CN=*.lumicloude.my.id or CN=customer1.lumicloude.my.id
```

---

### Issue 3: Wrong Website Content (Showing Default Page)

**Symptoms:** Accessing domain shows HestiaCP default page or wrong site

**Solutions:**

1. **Check HestiaCP aliases:**

   ```
   Web → customer1.lumicloude.my.id → Edit → Aliases
   Should include: example.com, www.example.com
   ```

2. **Verify Apache virtual host:**

   ```bash
   # SSH to home server
   sudo grep -r "example.com" /usr/local/hestia/data/users/*/web.conf

   # Should show customer's username and domain config
   ```

3. **Restart Apache:**

   ```bash
   sudo systemctl restart apache2
   ```

4. **Check .htaccess:**

   ```bash
   # In website root
   cat /home/username/web/customer1.lumicloude.my.id/public_html/.htaccess

   # Common WordPress .htaccess:
   RewriteEngine On
   RewriteBase /
   RewriteCond %{REQUEST_FILENAME} !-f
   RewriteCond %{REQUEST_FILENAME} !-d
   RewriteRule . /index.php [L]
   ```

---

### Issue 4: HestiaCP Panel Not Accessible

**Symptoms:** Cannot access https://100.86.108.93:8083 or https://hestia.lumicloude.my.id

**Solutions:**

```bash
# 1. Check HestiaCP service status
sudo systemctl status hestia
# If inactive (dead):
sudo systemctl start hestia
sudo systemctl enable hestia

# 2. Check if port is listening
sudo lsof -i :8083
# Should show: hestia service

# 3. Check firewall
sudo ufw status
# Port 8083 should be allowed from Tailscale network

# 4. Restart service
sudo systemctl restart hestia

# 5. Check logs
sudo journalctl -u hestia -n 50 --no-pager
```

---

### Issue 5: Customer Domain Shows "DNS_PROBE_FINISHED_NXDOMAIN"

**Symptoms:** Browser error saying domain doesn't exist

**Customer Action Required:**

1. **Verify CNAME is correct:**

   ```bash
   dig www.example.com CNAME +short
   # Should return: customer1.lumicloude.my.id
   ```

2. **Common customer mistakes:**
   - ❌ Typo in CNAME value (e.g., "custome1" instead of "customer1")
   - ❌ Added A record with wrong IP
   - ❌ Cloudflare proxy enabled (must be DNS Only)
   - ❌ TTL set too high (old records cached)

3. **Ask customer to check:**
   - Screenshot of their DNS settings
   - Confirm they saved changes
   - Check registrar's DNS propagation status

---

### Issue 6: Slow Website Performance

**Diagnostics:**

```bash
# 1. Test Cloudflare Tunnel latency
curl -w "@curl-format.txt" -o /dev/null -s https://customer1.lumicloude.my.id

# Create curl-format.txt:
time_namelookup:  %{time_namelookup}\n
time_connect:     %{time_connect}\n
time_starttransfer: %{time_starttransfer}\n
time_total:       %{time_total}\n

# 2. Check Tailscale connection
tailscale status
# Latency should be < 50ms for local network

# 3. Monitor Apache
sudo apachetop

# 4. Check server load
htop
```

**Optimization Tips:**

- Enable PHP OPcache in HestiaCP
- Use Cloudflare caching (customer's Cloudflare account)
- Optimize images and enable lazy loading
- Use CDN for static assets

---

## 📊 Scalability Analysis

### Why This Architecture Scales

| Aspect               | Scalability                                                |
| -------------------- | ---------------------------------------------------------- |
| **Config Changes**   | ❌ None needed per customer (wildcard handles all)         |
| **DNS Records**      | ✅ One A record per customer (aaPanel automation possible) |
| **SSL Certificates** | ✅ Automatic via Let's Encrypt (HestiaCP handles renewals) |
| **Server Resources** | ✅ Limited by home server specs (RAM/CPU/Storage)          |
| **Onboarding Time**  | ✅ 7 minutes per customer (5 min HestiaCP + 2 min DNS)     |

### Capacity Planning

**Current Home Server Specs:** (Adjust as needed)

- **CPU:** ?
- **RAM:** ?
- **Storage:** ?

**Estimated Capacity:**

- Typical WordPress site: ~50-100 MB storage, 256-512 MB RAM
- With 16 GB RAM: ~20-30 active sites (assuming 512 MB per site)
- With 500 GB storage: ~500-1000 sites (light content)

**Upgrade Path:**

1. Scale vertically: Add RAM/Storage to home server
2. Scale horizontally: Add second home server with load balancing
3. Migrate to VPS/cloud: Move to dedicated hosting when >50 customers

---

## 🎯 Quick Reference Commands

### Daily Operations

```bash
# Add new customer subdomain DNS record
# In aaPanel DNS Manager UI or via API:
curl -X POST "http://178.239.117.17:14400/api/dns/add_record" \
  -d "zone=lumicloude.my.id&type=A&name=customer2&value=198.41.192.67&ttl=600"

# Check Cloudflare Tunnel health
sudo systemctl status cloudflared
sudo cloudflared tunnel info 208136fc-de2b-4173-b7e6-7e18577cb1e2

# Monitor Apache access logs
sudo tail -f /var/log/apache2/domains/customer1.lumicloude.my.id.log

# List all HestiaCP domains
sudo /usr/local/hestia/bin/v-list-web-domains admin

# Test DNS resolution for new customer
dig customer-new.lumicloude.my.id +short
curl -I https://customer-new.lumicloude.my.id

# Restart all services (if needed)
sudo systemctl restart cloudflared
sudo systemctl restart hestia
sudo systemctl restart apache2
```

---

## 🎨 Customer Onboarding Checklist

Use this for each new customer:

- [ ] **Choose unique subdomain:** `customerX.lumicloude.my.id`
- [ ] **Create website in HestiaCP:**
  - [ ] Domain created
  - [ ] SSL enabled (Let's Encrypt)
  - [ ] PHP version selected
  - [ ] Database created (if needed)
  - [ ] Aliases added (customer's domains)
- [ ] **Add DNS A record in aaPanel:**
  - [ ] Type: A
  - [ ] Name: `customerX`
  - [ ] Value: `198.41.192.67`
  - [ ] TTL: `600`
- [ ] **Test subdomain works:**
  - [ ] `dig customerX.lumicloude.my.id` returns `198.41.192.67`
  - [ ] `curl -I https://customerX.lumicloude.my.id` returns HTTP 200/302
  - [ ] SSL certificate valid
- [ ] **Send customer CNAME instructions**
- [ ] **Upload website files** (or give customer FTP/SFTP access)
- [ ] **Verify customer's domain** (after they configure CNAME)
- [ ] **Test from multiple locations** (mobile, desktop, different ISPs)

---

## 🔐 Security Considerations

### Current Setup Security Features

✅ **Advantages:**

- No ports exposed on home router (Cloudflare Tunnel handles ingress)
- Tailscale provides encrypted VPN layer
- Let's Encrypt SSL certificates (automatic HTTPS)
- Cloudflare DDoS protection and WAF
- HestiaCP firewall and fail2ban integration

⚠️ **Potential Risks:**

- Home server single point of failure
- Shared hosting environment (resource isolation important)
- Customer data on home server (consider GDPR/data residency)

### Best Practices

1. **Regular Backups:**

   ```bash
   # HestiaCP automated backups
   sudo /usr/local/hestia/bin/v-schedule-user-backup admin

   # Or manual:
   sudo /usr/local/hestia/bin/v-backup-users
   ```

2. **Update Software:**

   ```bash
   # Update HestiaCP
   sudo /usr/local/hestia/bin/v-update-sys-hestia-all

   # Update OS packages
   sudo apt update && sudo apt upgrade -y

   # Update Cloudflare Tunnel
   sudo cloudflared update
   ```

3. **Monitor Logs:**

   ```bash
   # Apache errors
   sudo tail -f /var/log/apache2/error.log

   # HestiaCP audit log
   sudo tail -f /usr/local/hestia/log/auth.log

   # Cloudflared logs
   sudo journalctl -u cloudflared -f
   ```

---

## 📞 Support & Resources

### Documentation

- [HestiaCP Docs](https://docs.hestiacp.com/)
- [Cloudflare Tunnel Docs](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/)
- [Tailscale Docs](https://tailscale.com/kb/)

### Useful Tools

- **DNS Propagation Checker:** https://dnschecker.org/
- **SSL Test:** https://www.ssllabs.com/ssltest/
- **Cloudflare Tunnel Status:** https://dash.cloudflare.com/

### Emergency Contacts

- **Home Server Access:** SSH via Tailscale (100.86.108.93)
- **Cloudflare Dashboard:** https://dash.cloudflare.com/
- **aaPanel VPS:** https://178.239.117.17:14400

---

## 📝 Notes

- **DNS TTL:** Set to 600 seconds (10 minutes) for faster propagation during setup
- **Customer Education:** Most issues are customer CNAME configuration errors
- **Cloudflare Proxy:** Always instruct customers to use "DNS Only" mode (grey cloud)
- **Backup Schedule:** Configure HestiaCP to backup daily, retain 7 days
- **Monitoring:** Set up uptime monitoring (UptimeRobot, Pingdom, etc.)

---

## 🎉 Success Metrics

After following this guide, you should achieve:

- ⏱️ **7-minute customer onboarding** (from zero to live website)
- 🚀 **Zero config changes** to Cloudflare Tunnel per customer
- 🔒 **Automatic SSL** with Let's Encrypt wildcard certificate
- 🌐 **Global CDN** via Cloudflare's edge network
- 💰 **Cost-effective** hosting using home server resources

---

**Document Version:** 1.0  
**Last Updated:** 10 Februari 2026  
**Maintained By:** LumiCloud Infrastructure Team
