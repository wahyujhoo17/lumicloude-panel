# HestiaCP API Setup Guide

## Current Issue

HestiaCP API returns error code 10 (E_FORBIDDEN) when trying to access package information because:

1. Remote IP address is not whitelisted
2. User doesn't have permission to access certain admin commands

## Solution

### Option 1: Whitelist IP Address (Recommended for Remote Access)

If you're accessing HestiaCP from a remote machine (like your development machine or production server), you need to whitelist the IP address:

1. **Login to HestiaCP Web Interface**
   - URL: https://100.86.108.93:8083
   - Username: admin
   - Password: Elsafira2512

2. **Navigate to Server Settings**
   - Go to: Server → Settings → Configure → API

3. **Add IP Address**
   - Add your IP address to the allowed list
   - Or use `allow-all` to allow all IPs (not recommended for production)

### Option 2: Use SSH/Local Access

If you have SSH access to the server, you can run commands directly without IP restrictions:

```bash
# SSH into the server
ssh root@100.86.108.93

# List packages
v-list-user-packages format json

# List users
v-list-users format json
```

### Option 3: Create Custom Access Key with Permissions

Create an access key with specific permissions:

```bash
# Via SSH on the server
v-add-access-key admin 'v-list-user-packages,v-add-user,v-delete-user,v-add-web-domain' comment json
```

This will return:

```json
{
  "access_key": "xxxxx",
  "secret_key": "xxxxx"
}
```

Then update your `.env.local`:

```
HESTIA_ACCESS_KEY_ID=xxxxx
HESTIA_SECRET_KEY=xxxxx
```

## Current Workaround

The application now uses a **fallback mechanism**:

1. First tries to fetch packages from HestiaCP API
2. If API returns error code 10 (forbidden), falls back to default hardcoded packages in `/lib/packages.ts`
3. Displays warning to user that default packages are being used

## Default Packages Used

When HestiaCP API is not accessible, these packages are used:

- **Starter**: 50,000 IDR/month - 10GB disk, 100GB bandwidth, 10 websites, 10 databases
- **Business**: 150,000 IDR/month - 50GB disk, 500GB bandwidth, 50 websites, 50 databases
- **Enterprise**: 500,000 IDR/month - Unlimited resources

## How to Enable HestiaCP Package Integration

To enable dynamic package loading from HestiaCP:

1. **Whitelist your IP** in HestiaCP Server Settings → API
2. **Verify access** by running:

   ```bash
   curl -k -X POST "https://100.86.108.93:8083/api/" \
     -d "user=admin" \
     -d "password=Elsafira2512" \
     -d "returncode=yes" \
     -d "cmd=v-list-user-packages" \
     -d "format=json"
   ```

   Success response: Should return JSON with packages (not "10")

3. **Reload the application** - packages will now load from HestiaCP

## Creating Packages in HestiaCP

If you don't have any packages yet:

1. **Login to HestiaCP**
2. **Go to Packages** → Server → Packages
3. **Create New Package**:
   - Name: starter, business, enterprise, etc.
   - Set resource limits:
     - Disk Quota (MB)
     - Bandwidth (MB)
     - Web Domains
     - Databases
     - Mail Accounts
     - Cron Jobs
     - Backups

## Testing Package API

Test if packages are accessible:

```bash
# Method 1: Using curl
curl -k -X POST "https://100.86.108.93:8083/api/" \
  -d "user=admin" \
  -d "password=Elsafira2512" \
  -d "returncode=yes" \
  -d "cmd=v-list-user-packages" \
  -d "format=json"

# Method 2: Using the Next.js app
# Navigate to: http://localhost:3000/api/packages
# Should show packages with source: "hestiacp" or "default"
```

## Return Codes

- `0` = Success
- `10` = E_FORBIDDEN (IP not whitelisted or insufficient permissions)
- `3` = E_NOTEXIST (Object doesn't exist - no packages created yet)

## Additional Resources

- HestiaCP API Documentation: https://hestiacp.com/docs/server-administration/rest-api.html
- HestiaCP CLI Reference: https://hestiacp.com/docs/reference/cli.html
- Package Management: https://hestiacp.com/docs/user-guide/packages.html
