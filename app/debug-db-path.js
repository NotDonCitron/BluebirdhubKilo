#!/usr/bin/env node

require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });

const path = require('path');
const fs = require('fs');

console.log('🔍 Database Path Debugging');
console.log('==========================\n');

console.log('1. Environment Variables:');
console.log(`   DATABASE_URL: ${process.env.DATABASE_URL}`);

// Parse the database URL
const dbUrl = process.env.DATABASE_URL;
if (dbUrl && dbUrl.startsWith('file:')) {
  const dbPath = dbUrl.replace('file:', '');
  console.log(`   Parsed path: ${dbPath}`);
  
  // Check relative vs absolute path
  const absolutePath = path.resolve(dbPath);
  console.log(`   Absolute path: ${absolutePath}`);
  
  // Check if file exists
  console.log(`   File exists: ${fs.existsSync(absolutePath)}`);
  
  if (fs.existsSync(absolutePath)) {
    const stats = fs.statSync(absolutePath);
    console.log(`   File size: ${stats.size} bytes`);
    console.log(`   Modified: ${stats.mtime}`);
  }
}

console.log('\n2. Available database files:');
const prismaDir = path.resolve('./prisma');
if (fs.existsSync(prismaDir)) {
  const files = fs.readdirSync(prismaDir).filter(f => f.endsWith('.db'));
  files.forEach(file => {
    const filePath = path.join(prismaDir, file);
    const stats = fs.statSync(filePath);
    console.log(`   ${file}: ${stats.size} bytes, modified ${stats.mtime}`);
  });
}

console.log('\n3. Current working directory:');
console.log(`   CWD: ${process.cwd()}`);

console.log('\n4. Testing Prisma client connection...');
try {
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient({
    log: ['query', 'info', 'warn', 'error'],
  });
  
  console.log('   Prisma client created');
  
  // Try to connect and run a simple query
  prisma.$connect().then(async () => {
    console.log('   ✅ Connected to database');
    
    try {
      // Try to get database info
      const result = await prisma.$queryRaw`SELECT name FROM sqlite_master WHERE type='table'`;
      console.log(`   📋 Tables found: ${result.length}`);
      result.forEach(table => console.log(`      - ${table.name}`));
      
      await prisma.$disconnect();
    } catch (queryError) {
      console.log(`   ❌ Query failed: ${queryError.message}`);
      await prisma.$disconnect();
    }
  }).catch(connectError => {
    console.log(`   ❌ Connection failed: ${connectError.message}`);
  });
  
} catch (prismaError) {
  console.log(`   ❌ Prisma client error: ${prismaError.message}`);
}