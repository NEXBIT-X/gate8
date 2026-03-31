# Security Vulnerabilities Fix Guide

## Current Vulnerabilities Found

1. **cookie** <0.7.0 - Path/domain vulnerability
2. **esbuild** <=0.24.2 - Development server vulnerability  
3. **path-to-regexp** 4.0.0-6.2.2 - Backtracking regex vulnerability
4. **undici** <=5.28.5 - Random values & DoS vulnerabilities

## Fix Strategy

### 1. Update Dependencies with Security Patches

Run these commands to update to secure versions:

```bash
# Update Next.js to latest stable version (fixes many vulnerabilities)
npm update next

# Update vulnerable dependencies
npm update @cloudflare/next-on-pages

# Install security overrides
npm install --save-dev cookie@^0.7.0
npm install --save-dev esbuild@^0.24.3
```

### 2. Add Package Overrides

Add this to your `package.json` to force secure versions:

```json
{
  "overrides": {
    "cookie": "^0.7.0",
    "esbuild": "^0.24.3",
    "path-to-regexp": "^8.2.0",
    "undici": "^6.0.0"
  }
}
```

### 3. Alternative: Remove Problematic Dependencies

If you're not using Cloudflare Pages deployment, consider removing:

```bash
npm uninstall @cloudflare/next-on-pages
```

### 4. Add Security Headers

Create/update `next.config.ts` with security headers:

```typescript
const nextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
    ]
  },
}

export default nextConfig;
```

### 5. Create .npmrc for Security

Create `.npmrc` file:

```
audit-level=moderate
fund=false
```

## Quick Fix Commands

Run these commands in order:

```bash
# 1. Clean install
rm -rf node_modules package-lock.json
npm cache clean --force

# 2. Update all dependencies
npm update

# 3. Install latest secure versions
npm install cookie@^0.7.0 esbuild@^0.24.3 --save-dev

# 4. Run audit fix
npm audit fix --force

# 5. Verify fixes
npm audit
```

## Production Security Notes

1. **Development Only**: Most vulnerabilities only affect development server
2. **Vercel Deployment**: If using Vercel, these deps are handled by their platform
3. **Cloudflare Pages**: Only needed if deploying to Cloudflare

## Status After Fix

Expected result after applying fixes:
- ✅ Cookie vulnerability: Fixed with v0.7.0+
- ✅ ESBuild vulnerability: Fixed with v0.24.3+  
- ✅ Path-to-regexp: Updated to v8.2.0+
- ✅ Undici: Updated to v6.0.0+

Your application should have 0 high/critical vulnerabilities after applying these fixes.
