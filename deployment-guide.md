# AbacusHub - Vercel Deployment Guide

## 🚀 Vollständiges Production Deployment

### Voraussetzungen

- **Vercel Account** mit Team-Plan (für Postgres & Blob Storage)
- **Supabase Account** für Storage (optional, alternativ zu Vercel Blob)
- **GitHub Repository** für Continuous Deployment

---

## 1. Vercel Postgres Setup

### 1.1 Datenbank erstellen
```bash
# Im Vercel Dashboard
vercel storage create postgres --name abacushub-db --region fra1
```

### 1.2 Environment Variables
Kopiere die generierten Database URLs von Vercel:
```env
DATABASE_URL="postgresql://..."
POSTGRES_PRISMA_URL="postgresql://..."
POSTGRES_URL_NON_POOLING="postgresql://..."
```

---

## 2. Storage Configuration

### Option A: Supabase Storage (Empfohlen)
```env
STORAGE_TYPE="supabase"
SUPABASE_URL="https://lutlwrjbetraagitvgmf.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
SUPABASE_STORAGE_BUCKET="abacushub-files"
```

#### Supabase Bucket Setup:
1. Gehe zu Supabase Dashboard → Storage
2. Erstelle Bucket: `abacushub-files`
3. Setze Public Access: `false` (für Sicherheit)
4. Konfiguriere Policies für authenticated users

### Option B: Vercel Blob Storage
```bash
# Erstelle Blob Store
vercel storage create blob --name abacushub-storage
```

```env
STORAGE_TYPE="vercel-blob"
BLOB_READ_WRITE_TOKEN="vercel_blob_rw_..."
```

---

## 3. Environment Variables Setup

### 3.1 Vercel Environment Variables
```bash
# Production Environment
vercel env add DATABASE_URL production
vercel env add NEXTAUTH_SECRET production
vercel env add BLOB_READ_WRITE_TOKEN production

# Preview Environment
vercel env add DATABASE_URL preview
vercel env add NEXTAUTH_SECRET preview

# Development Environment
vercel env pull .env.local
```

### 3.2 Required Variables
```env
# Core
DATABASE_URL="postgresql://..."
NEXTAUTH_URL="https://your-app.vercel.app"
NEXTAUTH_SECRET="your-super-secure-secret-64-chars-minimum"

# Storage
STORAGE_TYPE="supabase"  # oder "vercel-blob"
SUPABASE_URL="https://lutlwrjbetraagitvgmf.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# File Upload
MAX_FILE_SIZE=524288000  # 500MB
MAX_CHUNK_SIZE=5242880   # 5MB

# Cron Jobs
CRON_SECRET="your-secure-cron-secret"

# Security
CORS_ORIGIN="https://your-app.vercel.app"
```

---

## 4. Database Migration

### 4.1 Schema Push (Initial)
```bash
# Lokal für Entwicklung
npx prisma db push

# Production Migration
npx prisma migrate deploy
```

### 4.2 Seed Data (Optional)
```bash
# Nach erstem Deployment
npx prisma db seed
```

---

## 5. Deployment Process

### 5.1 GitHub Integration
1. Verknüpfe Repository mit Vercel
2. Auto-Deploy bei Push auf `main` Branch
3. Preview Deployments für Pull Requests

### 5.2 Build Configuration
```json
{
  "buildCommand": "npm run vercel:build",
  "installCommand": "npm ci",
  "outputDirectory": ".next"
}
```

### 5.3 Manual Deployment
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod

# Mit Build Command
npm run vercel:deploy
```

---

## 6. Post-Deployment Setup

### 6.1 Domain Configuration
```bash
# Custom Domain
vercel domains add yourdomain.com
vercel domains add www.yourdomain.com

# SSL Certificate (automatisch)
vercel certs ls
```

### 6.2 Cron Jobs
Die Cron Jobs sind automatisch konfiguriert in `vercel.json`:
- **Chunk Cleanup**: täglich um 2:00 Uhr
- **Session Cleanup**: täglich um 3:00 Uhr

### 6.3 Monitoring Setup
```env
# Optional: Vercel Analytics
VERCEL_ANALYTICS_ID="your-analytics-id"

# Optional: Sentry Monitoring
SENTRY_DSN="your-sentry-dsn"
```

---

## 7. Testing Production Environment

### 7.1 Health Checks
```bash
# API Health
curl https://your-app.vercel.app/api/health

# Database Connection
curl https://your-app.vercel.app/api/db/status

# Storage Test
curl https://your-app.vercel.app/api/storage/test
```

### 7.2 Feature Tests
1. **User Registration & Login**
2. **File Upload (chunked)**
3. **File Download & Streaming**
4. **Workspace Creation**
5. **Task Management**
6. **Real-time Updates**

### 7.3 Performance Tests
```bash
# Load Testing mit Artillery
npm install -g artillery
artillery quick --count 10 --num 25 https://your-app.vercel.app
```

---

## 8. Troubleshooting

### 8.1 Common Issues

#### Build Failures
```bash
# Check build logs
vercel logs

# Local build test
npm run build
```

#### Database Connection
```bash
# Test connection
npx prisma db push --preview-feature

# Reset if needed
npx prisma migrate reset --force
```

#### Storage Issues
```bash
# Test Supabase connection
curl -X GET "https://lutlwrjbetraagitvgmf.supabase.co/storage/v1/bucket" \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY"
```

### 8.2 Performance Optimization

#### Bundle Size
```bash
# Analyze bundle
npm install -g @next/bundle-analyzer
ANALYZE=true npm run build
```

#### Database Optimization
```sql
-- Add Indexes
CREATE INDEX idx_files_workspace_id ON files(workspace_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_activity_logs_created_at ON activity_logs(created_at);
```

---

## 9. Security Checklist

- [ ] Environment Variables sind sicher gesetzt
- [ ] CORS korrekt konfiguriert
- [ ] CSP Headers aktiviert
- [ ] File Upload Limits konfiguriert
- [ ] Rate Limiting aktiviert
- [ ] Session Timeout konfiguriert
- [ ] Database Backups aktiviert
- [ ] SSL Certificate aktiv

---

## 10. Maintenance

### 10.1 Regular Tasks
- **Weekly**: Überprüfung der Error Logs
- **Monthly**: Database Performance Review
- **Quarterly**: Security Audit

### 10.2 Backup Strategy
```bash
# Database Backup (automatisch durch Vercel)
vercel postgres backup create abacushub-db

# Storage Backup (manuell)
# Implementiere eigene Backup-Lösung für Supabase Storage
```

### 10.3 Updates
```bash
# Dependencies Update
npm update
npm audit fix

# Next.js Update
npx @next/codemod@latest
```

---

## 🎉 Deployment Complete!

Deine AbacusHub App läuft jetzt in Production auf Vercel mit:

✅ **PostgreSQL Database** (Vercel Postgres)  
✅ **File Storage** (Supabase Storage)  
✅ **Chunked File Uploads** mit Resume  
✅ **Authentication** (NextAuth.js)  
✅ **Real-time Updates** (SSE)  
✅ **Automated Cleanup** (Cron Jobs)  
✅ **Production Optimizations**  
✅ **Security Headers**  
✅ **Performance Monitoring**  

**Live URL**: https://your-app.vercel.app  
**Admin Panel**: https://your-app.vercel.app/dashboard  
**Upload Test**: https://your-app.vercel.app/test-upload  

---

## Support

Bei Problemen oder Fragen:
- **Vercel Support**: https://vercel.com/support
- **Supabase Support**: https://supabase.com/support
- **GitHub Issues**: https://github.com/your-repo/issues