#!/bin/bash

# Create database directory if it doesn't exist
mkdir -p /workspace/prisma

# Copy production database if it exists locally
if [ -f ./prisma/prod.db ]; then
    cp ./prisma/prod.db /workspace/prisma/prod.db
    echo "✅ Production database copied"
fi

# Set proper permissions
chmod 644 /workspace/prisma/prod.db 2>/dev/null || echo "Database file not found, will be created"

# Run database migrations to ensure schema is up to date
echo "🔄 Running database migrations..."
npx prisma generate
npx prisma db push --accept-data-loss

# Seed the database with demo data
echo "🌱 Seeding database..."
npx prisma db seed

echo "✅ Database setup complete"