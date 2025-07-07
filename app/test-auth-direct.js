#!/usr/bin/env node

// Load environment variables
require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });

async function testAuthDirect() {
  console.log('🔍 Direct Authentication Component Test');
  console.log('======================================\n');

  try {
    // Test 1: Environment Variables
    console.log('1. Environment Variables:');
    console.log(`   DATABASE_URL: ${process.env.DATABASE_URL}`);
    console.log(`   NEXTAUTH_SECRET: ${process.env.NEXTAUTH_SECRET ? 'SET' : 'MISSING'}`);
    console.log(`   NEXTAUTH_URL: ${process.env.NEXTAUTH_URL}`);
    console.log(`   NODE_ENV: ${process.env.NODE_ENV}\n`);

    // Test 2: Database Connection
    console.log('2. Testing Database Connection...');
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    
    await prisma.$connect();
    console.log('   ✅ Database connected successfully');
    
    // Test 3: User Lookup
    console.log('\n3. Testing User Lookup...');
    const user = await prisma.user.findUnique({
      where: { email: 'john@doe.com' }
    });
    
    if (user) {
      console.log('   ✅ User found in database');
      console.log(`   📧 Email: ${user.email}`);
      console.log(`   👤 Name: ${user.name}`);
      console.log(`   🔑 Has Password: ${!!user.password}`);
      console.log(`   🆔 Role: ${user.role}`);
      console.log(`   🗂️ ID: ${user.id}`);
    } else {
      console.log('   ❌ User NOT found in database');
      console.log('   🔍 Checking all users...');
      
      const allUsers = await prisma.user.findMany({
        select: { email: true, name: true }
      });
      console.log(`   📋 Total users: ${allUsers.length}`);
      allUsers.forEach(u => console.log(`      - ${u.email} (${u.name})`));
    }

    // Test 4: Password Verification
    if (user && user.password) {
      console.log('\n4. Testing Password Verification...');
      const bcrypt = require('bcryptjs');
      
      const isValid = await bcrypt.compare('johndoe123', user.password);
      console.log(`   🔐 Password 'johndoe123' is valid: ${isValid ? '✅ YES' : '❌ NO'}`);
      
      // Test with wrong password
      const isInvalid = await bcrypt.compare('wrongpassword', user.password);
      console.log(`   🔐 Password 'wrongpassword' is valid: ${isInvalid ? '❌ YES (BAD!)' : '✅ NO (GOOD)'}`);
    }

    // Test 5: Simulate NextAuth Authorize Function
    console.log('\n5. Simulating NextAuth Authorize Function...');
    
    const credentials = {
      email: 'john@doe.com',
      password: 'johndoe123'
    };

    console.log('   📝 Simulating authorize function call...');
    console.log(`   📨 Input: email=${credentials.email}, password=${'*'.repeat(credentials.password.length)}`);

    // This is exactly what our authorize function does
    if (!credentials?.email || !credentials?.password) {
      console.log('   ❌ Missing credentials');
    } else {
      const testUser = await prisma.user.findUnique({
        where: { email: credentials.email }
      });

      console.log(`   👤 User lookup: ${testUser ? 'FOUND' : 'NOT FOUND'}`);

      if (testUser && testUser.password) {
        const bcrypt = require('bcryptjs');
        const isPasswordValid = await bcrypt.compare(credentials.password, testUser.password);
        
        console.log(`   🔑 Password valid: ${isPasswordValid ? '✅ YES' : '❌ NO'}`);

        if (isPasswordValid) {
          const authResult = {
            id: testUser.id,
            email: testUser.email,
            name: testUser.name,
            image: testUser.image,
            role: testUser.role,
          };
          
          console.log('   ✅ Authorization would SUCCEED');
          console.log(`   📤 Would return: ${JSON.stringify(authResult, null, 6)}`);
        } else {
          console.log('   ❌ Authorization would FAIL (invalid password)');
        }
      } else {
        console.log('   ❌ Authorization would FAIL (user not found or no password)');
      }
    }

    await prisma.$disconnect();

    // Test 6: NextAuth Configuration Test
    console.log('\n6. Testing NextAuth Configuration Loading...');
    try {
      // Try to import the auth configuration
      const authConfigPath = './lib/auth-config.ts';
      delete require.cache[require.resolve(authConfigPath)];
      
      console.log('   📥 Loading auth configuration...');
      const { authOptions } = require(authConfigPath);
      
      console.log('   ✅ Auth configuration loaded');
      console.log(`   🔌 Providers: ${authOptions.providers?.length || 0}`);
      console.log(`   📊 Session strategy: ${authOptions.session?.strategy || 'default'}`);
      
      if (authOptions.providers?.[0]?.authorize) {
        console.log('   ✅ Authorize function exists');
        
        // Test the actual authorize function
        console.log('\n7. Testing ACTUAL NextAuth Authorize Function...');
        try {
          const result = await authOptions.providers[0].authorize(credentials);
          
          if (result) {
            console.log('   ✅ AUTHORIZE FUNCTION RETURNS SUCCESS!');
            console.log(`   📤 Result: ${JSON.stringify(result, null, 6)}`);
          } else {
            console.log('   ❌ AUTHORIZE FUNCTION RETURNS NULL (FAILURE)');
          }
        } catch (authError) {
          console.log('   💥 AUTHORIZE FUNCTION THREW ERROR:');
          console.log(`      ${authError.message}`);
          console.log(`      ${authError.stack}`);
        }
      } else {
        console.log('   ❌ Authorize function NOT found');
      }
      
    } catch (configError) {
      console.log('   ❌ Failed to load auth configuration:');
      console.log(`      ${configError.message}`);
    }

    console.log('\n🎯 DIAGNOSIS:');
    console.log('=============');
    
    if (user && user.password) {
      const bcrypt = require('bcryptjs');
      const isValid = await bcrypt.compare('johndoe123', user.password);
      
      if (isValid) {
        console.log('✅ Database and credentials are correct');
        console.log('✅ Environment variables are loaded');
        console.log('❓ The issue is likely in NextAuth configuration or the authorize function not being called');
        console.log('\n🔧 NEXT STEPS:');
        console.log('1. Check if debug logs appear in server console during login');
        console.log('2. If no debug logs: NextAuth authorize function is not being invoked');
        console.log('3. Possible causes: Module import issues, NextAuth setup problems, or middleware interference');
      } else {
        console.log('❌ Password verification failed - check password hash');
      }
    } else {
      console.log('❌ User not found or missing password - database issue');
    }

  } catch (error) {
    console.error('💥 Test failed:', error);
    console.error('Stack:', error.stack);
  }
}

testAuthDirect();