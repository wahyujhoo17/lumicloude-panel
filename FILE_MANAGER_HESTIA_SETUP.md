# File Manager Setup - HestiaCP Directory Access

## Overview

The file manager in this panel is designed to connect directly to HestiaCP user directories located at:

```
/home/{username}/web/{domain}/public_html/
```

However, by default, the Next.js application may not have permission to access these directories.

## Current Behavior

The file manager automatically falls back to a local directory if HestiaCP directory is not accessible:

```
{project_root}/public/uploads/customers/{username}/{domain}/
```

## Setup for Production (HestiaCP Directory Access)

To enable direct access to HestiaCP directories, you need to grant the appropriate permissions:

### Option 1: Run Next.js as HestiaCP User (Recommended for Development)

```bash
# Run the Next.js app as the hestia user
sudo -u admin npm run dev
# or for production
sudo -u admin npm run build && sudo -u admin npm start
```

### Option 2: Add Next.js Process User to HestiaCP Groups

```bash
# Find your Next.js process user (usually your current user or www-data)
whoami

# Add the user to necessary groups
sudo usermod -a -G admin your-nextjs-user
sudo usermod -a -G www-data your-nextjs-user

# Set proper permissions on web directories
sudo chmod -R 775 /home/*/web/*/public_html
sudo chown -R admin:www-data /home/*/web/*/public_html
```

### Option 3: Create Symbolic Links

```bash
# Create a symbolic link in your project directory
mkdir -p public/uploads/customers
cd public/uploads/customers

# For each customer
ln -s /home/{username}/web/{domain}/public_html {username}/{domain}

# Example:
ln -s /home/customer1/web/example.com/public_html customer1/example.com
```

### Option 4: Use Bind Mounts (Docker/Linux)

If running in Docker or Linux environment:

```bash
# In your docker-compose.yml or mount command
volumes:
  - /home:/host-home:ro  # Read-only access to all home directories
```

## Verifying Access

To check if the file manager can access HestiaCP directories:

1. Open the File Manager in the customer panel
2. Check the browser console (F12) or server logs
3. Look for log messages indicating which directory is being used:
   - `"Using HestiaCP directory: /home/..."` - Direct access working ✅
   - `"Falling back to local directory"` - Using fallback directory ⚠️

## Security Considerations

### For Production:

1. **Never run as root** - Use a dedicated user with limited permissions
2. **Read-only access** - Consider mounting HestiaCP directories as read-only if you only need file viewing
3. **Sandboxing** - Use containers or VMs to isolate the Next.js app
4. **Path validation** - The API already validates paths to prevent directory traversal

### Permissions Best Practices:

```bash
# Recommended permissions for web directories
chmod 755 /home/*/web/*/public_html        # Directories
chmod 644 /home/*/web/*/public_html/*       # Files

# Allow group write if needed
chmod 775 /home/*/web/*/public_html         # Directories
chmod 664 /home/*/web/*/public_html/*       # Files
```

## Alternative: API-Based File Management

If direct filesystem access is not feasible, you can extend the HestiaCP API client to use SSH/SFTP:

```typescript
// Example using SSH2-SFTP
import { Client } from "ssh2";

class HestiaFileManager {
  async listFiles(username: string, path: string) {
    // Connect via SFTP to /home/{username}/web/{domain}/public_html/
    // List files using SFTP commands
  }
}
```

## Testing the Setup

Create a test file in HestiaCP and verify it appears in the file manager:

```bash
# As the HestiaCP user
sudo -u admin touch /home/{username}/web/{domain}/public_html/test.txt
echo "Hello from HestiaCP" > /home/{username}/web/{domain}/public_html/test.txt
```

Then refresh the file manager in the panel. If you see the `test.txt` file, direct access is working!

## Troubleshooting

### "No files found" message:

1. Check server logs for permission errors
2. Verify the HestiaCP user exists: `ls -la /home/`
3. Verify the website exists: `ls -la /home/{username}/web/`
4. Check current permissions: `ls -la /home/{username}/web/{domain}/public_html/`

### "Permission denied" errors:

1. Check the user running Next.js: `ps aux | grep node`
2. Verify group membership: `groups {user}`
3. Check directory ownership: `ls -la /home/{username}/web/`

### Files not syncing:

- Clear Next.js cache: `rm -rf .next`
- Restart the Next.js server
- Check if using the correct domain

## Current Status

✅ Fallback to local directory working
⚠️ HestiaCP direct access requires manual setup
📋 All file operations (upload, edit, delete, extract) supported in both modes
