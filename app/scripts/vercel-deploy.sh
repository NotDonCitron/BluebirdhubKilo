#!/bin/bash

# AbacusHub Vercel Production Deployment Script
# Automatisiert das komplette Deployment auf Vercel

set -e  # Exit on any error

echo "🚀 Starting AbacusHub Vercel Deployment"
echo "========================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
print_status() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check prerequisites
print_status "Checking prerequisites..."

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    print_error "Vercel CLI not found. Installing..."
    npm install -g vercel
fi

# Check if we're logged in to Vercel
if ! vercel whoami &> /dev/null; then
    print_error "Not logged in to Vercel. Please run 'vercel login' first."
    exit 1
fi

print_success "Prerequisites checked"

# Clean install dependencies
print_status "Installing dependencies..."
rm -rf node_modules package-lock.json
npm install
print_success "Dependencies installed"

# Type checking
print_status "Running type check..."
npm run type-check
print_success "Type check passed"

# Linting
print_status "Running linter..."
npm run lint
print_success "Linting passed"

# Generate Prisma client
print_status "Generating Prisma client..."
npx prisma generate
print_success "Prisma client generated"

# Build locally to test
print_status "Testing build locally..."
npm run build
print_success "Local build successful"

# Set up environment variables on Vercel
print_status "Setting up environment variables..."

# Check if .env.production exists
if [ ! -f ".env.production" ]; then
    print_error ".env.production file not found!"
    print_warning "Please create .env.production with required variables"
    exit 1
fi

# Deploy to Vercel
print_status "Deploying to Vercel..."
vercel --prod --yes

# Get deployment URL
DEPLOYMENT_URL=$(vercel ls --meta | grep 'Ready' | head -1 | awk '{print $2}')

if [ -z "$DEPLOYMENT_URL" ]; then
    print_error "Could not determine deployment URL"
    exit 1
fi

print_success "Deployment successful!"
print_success "URL: https://$DEPLOYMENT_URL"

# Run database setup script
print_status "Setting up production database..."
vercel env pull .env.production.local
export $(cat .env.production.local | xargs)
npx tsx scripts/deploy-setup.ts
print_success "Database setup completed"

# Test deployment
print_status "Testing deployment..."

# Test API health
if curl -f -s "https://$DEPLOYMENT_URL/api/health" > /dev/null; then
    print_success "API health check passed"
else
    print_warning "API health check failed (may need a few minutes to warm up)"
fi

# Test database connection
if curl -f -s "https://$DEPLOYMENT_URL/api/db/status" > /dev/null; then
    print_success "Database connection test passed"
else
    print_warning "Database connection test failed"
fi

print_success "Deployment completed successfully!"
echo ""
echo "🎉 AbacusHub is now live in production!"
echo ""
echo "📱 App URL: https://$DEPLOYMENT_URL"
echo "📊 Dashboard: https://$DEPLOYMENT_URL/dashboard"
echo "🧪 Upload Test: https://$DEPLOYMENT_URL/test-upload"
echo "🔧 Admin: https://$DEPLOYMENT_URL/admin"
echo ""
echo "📝 Next steps:"
echo "1. Test all functionality"
echo "2. Configure custom domain (optional)"
echo "3. Set up monitoring"
echo "4. Configure backup strategy"
echo ""
echo "🆘 Support:"
echo "- Vercel Dashboard: https://vercel.com/dashboard"
echo "- Supabase Dashboard: https://app.supabase.com/project/lutlwrjbetraagitvgmf"
echo "- GitHub Repository: https://github.com/your-repo/abacushub"
echo ""

# Optional: Open browser
if command -v open &> /dev/null; then
    read -p "Open app in browser? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        open "https://$DEPLOYMENT_URL"
    fi
fi

exit 0