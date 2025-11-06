# Studio LeFlow - Deployment Guide

## Prerequisites

Before deploying, ensure you have all required API keys and services configured:

1. **Resend Account** - For email verification
   - Domain `studioleflow.com` verified with SPF, DKIM, DMARC records
   - API Key generated

2. **UploadThing Account** - For music file uploads
   - Project created
   - API Token generated

3. **PostgreSQL Database** - For production data
   - Must be provisioned before first deployment (creates a separate production database)
   - Replit automatically provides DATABASE_URL for the production database

## Deployment Steps

### 1. Provision Production Database (First Time Only)

If this is your first deployment, you need to create a production PostgreSQL database:

1. Open Replit Database tool (left sidebar)
2. Click "Create Database" or ask Agent to provision one
3. Database schema will be automatically synchronized on first deployment

**Note:** This creates a separate production database. Your development database remains unchanged.

### 2. Configure Deployment Secrets

In Replit, go to: **Deploy → Secrets** and add the following:

| Secret Name | Description | Example Value |
|------------|-------------|---------------|
| `SESSION_SECRET` | Random string for session encryption | Generate with: `openssl rand -base64 32` |
| `RESEND_API_KEY` | Resend API key for emails | `re_xxxxxxxxxxxxx` |
| `UPLOADTHING_TOKEN` | UploadThing API token | `sk_live_xxxxxxxxxxxxx` |

**Important Notes:**
- `DATABASE_URL` is automatically provided by Replit - you don't need to add it manually
- `SESSION_SECRET` should be a strong random string (minimum 32 characters)
- Never commit these values to git

### 3. Deploy the Application

1. Click the **"Deploy"** button in Replit (top right)
2. Replit will automatically:
   - Run `npm run build` to compile frontend and backend
   - Create a production deployment
   - Provide a live URL (e.g., `studioleflow-username.replit.app`)
   - **Automatically populate default CMS content** on first startup (hero section, services, CTA)

**Automatic CMS Initialization:**
- The server automatically checks if CMS content exists on startup
- If the `cms_content` table is empty, it will seed default content for the home page
- This ensures the website displays correctly on first deployment
- Existing content is never overwritten

### 4. Configure Custom Domain (Optional)

After deployment:

1. In Replit Deploy settings, add custom domain: `studioleflow.com`
2. In Namecheap DNS settings, add the CNAME record provided by Replit
3. Wait for DNS propagation (5-30 minutes)

## Environment Variable Validation

The server includes automatic validation and will **fail to start** with a clear error message if any required environment variables are missing:

```
================================================================================
DEPLOYMENT CONFIGURATION ERROR
================================================================================

The following environment variables are required but not set:
  - DATABASE_URL
  - SESSION_SECRET
  - RESEND_API_KEY

Please add these in Replit Deployment → Secrets
================================================================================
```

## Deployment Configuration

The deployment is configured in `.replit`:

```toml
[deployment]
deploymentTarget = "autoscale"
build = ["npm", "run", "build"]
run = ["node", "dist/index.js"]
```

- **Mode**: Autoscale (automatically scales based on traffic)
- **Build**: Compiles Vite frontend and esbuild backend
- **Run**: Executes production server on port 5000

## Troubleshooting

### Server shows "Internal Server Error"

Check deployment logs:
1. Go to Deploy → Your Deployment → Logs
2. Look for environment variable validation errors
3. Ensure all secrets are properly configured

### Database connection errors

- `DATABASE_URL` is automatically provided by Replit when you deploy
- No manual database configuration needed
- Database schema will be automatically created on first startup
- Ensure database schema is up to date with `npm run db:push` if you make schema changes

### Email verification not working

- Verify `RESEND_API_KEY` is set
- Check that `studioleflow.com` domain is verified in Resend
- Ensure DNS records (SPF, DKIM, DMARC) are properly configured

### Upload functionality broken

- Verify `UPLOADTHING_TOKEN` is set
- Check UploadThing dashboard for API quota/errors
- Ensure CSP headers allow `https://uploadthing.com`

## Security Features

The production deployment includes:

- **Content Security Policy (CSP)** headers to prevent XSS attacks
- **Secure session management** with HttpOnly cookies
- **Rate limiting** on contact form (3 submissions per hour per IP)
- **Email verification** required for user registration
- **Admin-only routes** protected by authentication middleware

## Monitoring

After deployment:
- Monitor logs in Deploy → Logs tab
- Check error rates and response times
- Verify email delivery in Resend dashboard
- Monitor database performance in Replit database tab

## Production Checklist

Before going live:

- [ ] All environment variables configured in Deployment Secrets
- [ ] Custom domain `studioleflow.com` configured and DNS propagated
- [ ] Email verification tested with real email addresses
- [ ] File upload tested with MP3/WAV files
- [ ] Admin panel accessible and functional
- [ ] Contact form tested with spam protection
- [ ] All features tested in production environment
