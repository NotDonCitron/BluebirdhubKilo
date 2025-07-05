# Google Cloud Platform Deployment Guide

## Prerequisites

### 1. Google Cloud Setup
```bash
# Install Google Cloud CLI
curl https://sdk.cloud.google.com | bash
exec -l $SHELL

# Login and set project
gcloud auth login
gcloud config set project YOUR-PROJECT-ID
gcloud auth application-default login
```

### 2. Enable Required APIs
```bash
gcloud services enable \
  appengine.googleapis.com \
  cloudbuild.googleapis.com \
  sqladmin.googleapis.com \
  storage.googleapis.com
```

### 3. Create Cloud SQL Instance
```bash
# Create PostgreSQL instance
gcloud sql instances create abacushub-db \
  --database-version=POSTGRES_15 \
  --tier=db-f1-micro \
  --region=us-central1

# Create database
gcloud sql databases create abacushub \
  --instance=abacushub-db

# Create user
gcloud sql users create abacususer \
  --instance=abacushub-db \
  --password=SECURE_PASSWORD
```

### 4. Create Cloud Storage Bucket
```bash
# Create bucket for file uploads
gsutil mb gs://YOUR-PROJECT-ID-files
gsutil iam ch allUsers:objectViewer gs://YOUR-PROJECT-ID-files
```

## Environment Variables

### Set in Google Cloud Console or via CLI:
```bash
# Database connection
gcloud app deploy --set-env-vars DATABASE_URL="postgresql://abacususer:SECURE_PASSWORD@/abacushub?host=/cloudsql/YOUR-PROJECT-ID:us-central1:abacushub-db"

# Authentication
gcloud app deploy --set-env-vars NEXTAUTH_SECRET="your-super-secure-secret-key"
gcloud app deploy --set-env-vars NEXTAUTH_URL="https://abacushub-dot-YOUR-PROJECT-ID.uw.r.appspot.com"

# Google Cloud
gcloud app deploy --set-env-vars GOOGLE_CLOUD_PROJECT_ID="YOUR-PROJECT-ID"
gcloud app deploy --set-env-vars CLOUD_STORAGE_BUCKET="YOUR-PROJECT-ID-files"
```

## Deployment Steps

### 1. Update Configuration Files
```bash
# Update app.yaml with your project ID
sed -i 's/YOUR-PROJECT-ID/your-actual-project-id/g' app.yaml

# Update cloudbuild.yaml substitution variables
# Edit cloudbuild.yaml and replace placeholder values
```

### 2. First-Time Database Setup
```bash
# Generate Prisma client for PostgreSQL
npm run db:generate

# Run initial migration
npx prisma migrate deploy
```

### 3. Deploy Application
```bash
# Option 1: Direct deployment
npm run gcp:setup
npm run gcloud:deploy

# Option 2: Using Cloud Build (recommended)
npm run gcloud:build
```

### 4. Set Up Cloud Build Triggers (Optional)
```bash
# Create build trigger from GitHub
gcloud builds triggers create github \
  --repo-name=BluebirdhubKilo \
  --repo-owner=NotDonCitron \
  --branch-pattern="^main$" \
  --build-config=app/cloudbuild.yaml
```

## Monitoring & Maintenance

### View Logs
```bash
# App Engine logs
gcloud app logs tail -s default

# Cloud Build logs
gcloud builds list
gcloud builds log BUILD_ID
```

### Database Management
```bash
# Connect to Cloud SQL
gcloud sql connect abacushub-db --user=abacususer

# Run migrations
gcloud app deploy --version=migration && \
gcloud app services set-traffic default --splits=migration=0 && \
gcloud app versions delete migration
```

### Scaling Configuration
```bash
# Update scaling in app.yaml
automatic_scaling:
  min_instances: 1
  max_instances: 10
  target_cpu_utilization: 0.7
```

## Troubleshooting

### Common Issues

1. **Build Fails with Lint Errors**
   - Complete the lint error fixes first
   - Run `npm run lint` locally

2. **Database Connection Issues**
   - Verify Cloud SQL instance is running
   - Check connection string format
   - Ensure Cloud SQL API is enabled

3. **File Upload Issues**
   - Verify Cloud Storage bucket exists
   - Check bucket permissions
   - Ensure storage library is installed

4. **Environment Variables**
   - Use `gcloud app deploy --set-env-vars` for sensitive data
   - Avoid committing secrets to repository

### Performance Optimization

1. **Cold Starts**
   - Set `min_instances: 1` in app.yaml
   - Consider using Cloud Run for faster cold starts

2. **Database Performance**
   - Upgrade to higher tier instance for production
   - Enable connection pooling
   - Use read replicas for heavy read workloads

3. **Static Assets**
   - Use Cloud CDN for better performance
   - Enable compression in app.yaml

## Cost Optimization

1. **App Engine**
   - Use automatic scaling with appropriate targets
   - Monitor usage in Cloud Console

2. **Cloud SQL**
   - Use smallest instance that meets performance needs
   - Enable automated backups with retention policy

3. **Cloud Storage**
   - Set lifecycle policies for old files
   - Use appropriate storage classes

## Security Checklist

- ✅ Environment variables stored securely
- ✅ Cloud SQL instance has private IP
- ✅ Storage bucket has appropriate IAM policies
- ✅ App Engine has security headers configured
- ✅ HTTPS enforced (automatic with App Engine)
- ✅ Secrets stored in Secret Manager (optional)

## Next Steps After Deployment

1. **Domain Setup**
   - Configure custom domain in App Engine
   - Update NEXTAUTH_URL environment variable

2. **Monitoring**
   - Set up Cloud Monitoring alerts
   - Configure error reporting

3. **Backup Strategy**
   - Configure automated database backups
   - Set up file storage backup policies

4. **CI/CD Enhancement**
   - Add staging environment
   - Implement blue-green deployments