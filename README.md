# LumiCloud Control Panel

Modern web-based control panel untuk mengelola hosting customers menggunakan HestiaCP sebagai backend.

## 🎯 Features

- ✅ **Full Automation** - Buat customer baru dengan 1 klik (7 menit manual → 30 detik otomatis)
- ✅ **HestiaCP Integration** - Gunakan HestiaCP sebagai backend via API
- ✅ **aaPanel DNS** - Automasi DNS record management
- ✅ **SSL Automation** - Let's Encrypt SSL otomatis
- ✅ **Customer Dashboard** - Modern UI untuk manage customers
- ✅ **Multi-tenant** - Support unlimited customers
- ✅ **Activity Logs** - Track semua aktivitas

## 🏗️ Architecture

```
Next.js Control Panel (Frontend)
       ↓
  API Routes (Backend)
       ↓
  ┌──────────────┬─────────────┐
  ↓              ↓             ↓
HestiaCP     aaPanel DNS   PostgreSQL
100.86.108.93:8083
```

## 📦 Tech Stack

- **Frontend**: Next.js 14, React, TailwindCSS, Shadcn UI
- **Backend**: Next.js API Routes, Prisma ORM
- **Database**: PostgreSQL
- **External APIs**: HestiaCP API, aaPanel API
- **Hosting Backend**: HestiaCP (100.86.108.93:8083)
- **DNS**: aaPanel (178.239.117.17:14400)

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Setup Environment Variables

Copy `.env.example` to `.env` dan isi dengan credentials:

```bash
cp .env.example .env
```

Edit `.env`:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/lumicloud"

# HestiaCP Configuration
HESTIA_HOST="100.86.108.93"
HESTIA_PORT="8083"
HESTIA_USER="admin"
HESTIA_PASSWORD="your-hestia-password"

# aaPanel DNS Configuration
AAPANEL_HOST="178.239.117.17"
AAPANEL_PORT="14400"
AAPANEL_API_KEY="your-api-key"
AAPANEL_API_SECRET="your-api-secret"

# Cloudflare Configuration
CLOUDFLARE_EDGE_IP="198.41.192.67"
PRIMARY_DOMAIN="lumicloude.my.id"
```

### 3. Setup Database

```bash
# Generate Prisma Client
npm run db:generate

# Push schema to database
npm run db:push

# (Optional) Open Prisma Studio
npm run db:studio
```

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## 📖 Usage

### Create New Customer (Automated)

1. Go to Dashboard → Add New Customer
2. Fill customer information:
   - Name, Email, Phone, Company
   - Choose plan (Basic/Standard/Premium/Enterprise)
   - Optional: Custom domain
   - Optional: Create database
3. Click "Create Customer"

**What happens automatically:**

1. ✅ Create Hestia user account
2. ✅ Create subdomain (customerX.lumicloude.my.id)
3. ✅ Setup DNS A record
4. ✅ Enable SSL certificate (Let's Encrypt)
5. ✅ Create database (if requested)
6. ✅ Save to database
7. ✅ Log activity

**Total time: ~30 seconds** (vs 7 minutes manual)

### API Endpoints

#### Create Customer

```bash
POST /api/customers/create

{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "+62812345678",
  "plan": "STANDARD",
  "customDomain": "example.com",
  "needDatabase": true
}
```

#### List Customers

```bash
GET /api/customers?page=1&limit=10&status=ACTIVE&search=john
```

#### Get Customer Details

```bash
GET /api/customers/:id
```

#### Update Customer

```bash
PATCH /api/customers/:id

{
  "status": "SUSPENDED"
}
```

#### Dashboard Stats

```bash
GET /api/dashboard/stats
```

## 🔧 API Libraries

### HestiaCP API (`lib/hestia-api.ts`)

```typescript
import { getHestiaAPI } from "@/lib/hestia-api";

const hestia = getHestiaAPI();

// Create user
await hestia.createUser({
  username: "customer1",
  password: "secure_password",
  email: "customer@example.com",
});

// Add domain
await hestia.addDomain({
  user: "customer1",
  domain: "customer1.lumicloude.my.id",
  aliases: ["www.customer1.lumicloude.my.id"],
});

// Enable SSL
await hestia.enableSSL("customer1", "customer1.lumicloude.my.id");
```

### aaPanel API (`lib/aapanel-api.ts`)

```typescript
import { getAAPanelAPI } from "@/lib/aapanel-api";

const aapanel = getAAPanelAPI();

// Add DNS A record
await aapanel.addSubdomainARecord({
  primaryDomain: "lumicloude.my.id",
  subdomain: "customer1",
  ip: "198.41.192.67",
  ttl: 600,
});
```

## 📊 Database Schema

### Customer

- Personal info (name, email, phone, company)
- Hestia credentials
- Plan & billing info
- Status (ACTIVE/SUSPENDED/CANCELLED)

### Website

- Subdomain & custom domain
- SSL status & configuration
- PHP version
- Disk & bandwidth usage

### Database

- Database credentials
- Size tracking

### ActivityLog

- Audit trail untuk semua aktivitas

## 🎨 UI Components

- **Dashboard**: Overview stats & recent activities
- **Customer List**: Searchable, filterable table
- **Create Customer**: Step-by-step form
- **Customer Details**: Full information & management

## 🔐 Security

- Environment variables untuk credentials
- HTTPS untuk semua connections
- Self-signed certificate support
- Activity logging
- Input validation dengan Zod

## 📝 Development

### Project Structure

```
lumicloud-panel/
├── app/
│   ├── api/              # API routes
│   ├── dashboard/        # Dashboard pages
│   └── globals.css       # Global styles
├── lib/
│   ├── hestia-api.ts     # HestiaCP API wrapper
│   ├── aapanel-api.ts    # aaPanel API wrapper
│   └── prisma.ts         # Prisma client
├── prisma/
│   └── schema.prisma     # Database schema
└── guide.md              # Original workflow guide
```

### Adding New Features

1. Create API route di `app/api/`
2. Use API wrappers dari `lib/`
3. Update Prisma schema jika perlu
4. Create UI component di `app/dashboard/`

## 🚀 Deployment

### Production Deployment

1. Setup PostgreSQL database
2. Set production environment variables
3. Build application:

```bash
npm run build
npm run start
```

### Docker (Optional)

```bash
# TODO: Add Dockerfile
```

## 📞 Support

- Documentation: `guide.md`
- API Reference: Check `lib/` folder
- Issues: Create GitHub issue

## 📄 License

Private - LumiCloud Infrastructure Team

---

**Version**: 1.0  
**Last Updated**: 11 Februari 2026
