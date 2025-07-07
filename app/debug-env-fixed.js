#!/usr/bin/env node

// Load environment variables properly
require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });

const fs = require('fs');
const path = require('path');

function checkEnvironmentVariables() {
  console.log('🌍 === ENVIRONMENT VARIABLES CHECK (FIXED) ===\n');
  
  // Check runtime environment variables after loading
  console.log('🔧 Runtime Environment Variables (After Loading):');
  const requiredVars = [
    'DATABASE_URL',
    'NEXTAUTH_SECRET',
    'NEXTAUTH_URL',
    'NODE_ENV'
  ];
  
  requiredVars.forEach(varName => {
    const value = process.env[varName];
    console.log(`   ${varName}: ${value ? '✅ SET' : '❌ MISSING'}`);
    if (value) {
      // Show partial value for security
      if (varName.includes('SECRET') || varName.includes('PASSWORD')) {
        console.log(`     Value: ${value.substring(0, 8)}...`);
      } else {
        console.log(`     Value: ${value}`);
      }
    }
  });
  
  // Check if all required variables are present
  const missing = requiredVars.filter(varName => !process.env[varName]);
  if (missing.length > 0) {
    console.log(`\n❌ Missing required variables: ${missing.join(', ')}`);
    return false;
  } else {
    console.log('\n✅ All required environment variables are set');
    return true;
  }
}

async function testLoginWithProperEnv() {
  console.log('\n🧪 === LOGIN TEST WITH ENVIRONMENT ===\n');
  
  try {
    // Now test the auth with proper environment
    const { PrismaClient } = require('@prisma/client');
    const bcrypt = require('bcryptjs');
    
    const prisma = new PrismaClient();
    
    console.log('1. Testing database connection with loaded env...');
    await prisma.$connect();
    console.log('✅ Database connected with environment variables');
    
    console.log('\n2. Testing user lookup...');
    const user = await prisma.user.findUnique({
      where: { email: 'john@doe.com' }
    });
    
    if (user) {
      console.log('✅ User found');
      console.log(`   Email: ${user.email}`);
      console.log(`   Name: ${user.name}`);
      console.log(`   Has password: ${!!user.password}`);
      
      console.log('\n3. Testing password verification...');
      const isValid = await bcrypt.compare('johndoe123', user.password);
      console.log(`   Password valid: ${isValid ? '✅ YES' : '❌ NO'}`);
      
      if (isValid) {
        console.log('\n✅ All credential checks pass - the issue is likely in NextAuth configuration');
      } else {
        console.log('\n❌ Password verification failed');
      }
    } else {
      console.log('❌ User not found');
    }
    
    await prisma.$disconnect();
    
  } catch (error) {
    console.error('❌ Database test failed:', error);
  }
}

// Test the actual login flow with debugging
async function testNextAuthFlow() {
  console.log('\n🔐 === NEXTAUTH FLOW WITH DEBUGGING ===\n');
  
  // Start the Next.js server programmatically for testing
  try {
    console.log('Testing NextAuth flow with proper environment...');
    
    // Simulate what NextAuth does
    const credentials = {
      email: 'john@doe.com',
      password: 'johndoe123'
    };
    
    console.log('Simulating NextAuth authorize function...');
    
    const { PrismaClient } = require('@prisma/client');
    const bcrypt = require('bcryptjs');
    
    const prisma = new PrismaClient();
    
    // This simulates the exact authorize function
    if (!credentials?.email || !credentials?.password) {
      console.log('❌ Missing credentials');
      return false;
    }

    const user = await prisma.user.findUnique({
      where: {
        email: credentials.email
      }
    });

    console.log('User lookup result:', {
      found: !!user,
      email: user?.email,
      hasPassword: !!user?.password,
      role: user?.role
    });

    if (!user || !user.password) {
      console.log('❌ User not found or no password');
      return false;
    }

    const isPasswordValid = await bcrypt.compare(
      credentials.password,
      user.password
    );

    console.log('Password validation:', {
      isValid: isPasswordValid,
      email: user.email
    });

    if (!isPasswordValid) {
      console.log('❌ Invalid password');
      return false;
    }

    console.log('✅ Authorization would succeed');
    console.log('Return value would be:', {
      id: user.id,
      email: user.email,
      name: user.name,
      image: user.image,
      role: user.role,
    });
    
    await prisma.$disconnect();
    return true;
    
  } catch (error) {
    console.error('❌ NextAuth flow test error:', error);
    return false;
  }
}

async function main() {
  const envOk = checkEnvironmentVariables();
  
  if (!envOk) {
    console.log('\n💡 Environment variables are not loading properly!');
    console.log('This explains why login is failing.');
    console.log('\nTo fix:');
    console.log('1. Make sure .env.local exists');
    console.log('2. Restart the Next.js development server');
    console.log('3. Check that Next.js is loading environment variables');
    return;
  }
  
  await testLoginWithProperEnv();
  await testNextAuthFlow();
  
  console.log('\n🎯 === SUMMARY ===');
  console.log('If the simulated NextAuth flow works but the actual login fails,');
  console.log('the issue is likely one of these:');
  console.log('1. Environment variables not loading in the Next.js server');
  console.log('2. CSRF token issues');
  console.log('3. Session configuration problems');
  console.log('4. Middleware interference');
}

main().catch(console.error);