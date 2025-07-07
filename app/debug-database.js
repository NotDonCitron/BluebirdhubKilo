#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

const prisma = new PrismaClient();

async function debugDatabase() {
  console.log('🔍 === DATABASE DEBUGGING STARTED ===\n');
  
  try {
    // 1. Check database connection
    console.log('1. Testing database connection...');
    await prisma.$connect();
    console.log('✅ Database connection successful\n');
    
    // 2. Check if database file exists (for SQLite)
    const dbUrl = process.env.DATABASE_URL;
    console.log(`2. Database URL: ${dbUrl}`);
    if (dbUrl && dbUrl.startsWith('file:')) {
      const dbPath = dbUrl.replace('file:', '');
      const fullPath = path.resolve(dbPath);
      console.log(`   Database file path: ${fullPath}`);
      console.log(`   Database file exists: ${fs.existsSync(fullPath)}`);
      if (fs.existsSync(fullPath)) {
        const stats = fs.statSync(fullPath);
        console.log(`   Database file size: ${stats.size} bytes`);
        console.log(`   Last modified: ${stats.mtime}\n`);
      }
    }
    
    // 3. Count total users
    console.log('3. Checking user table...');
    const userCount = await prisma.user.count();
    console.log(`   Total users in database: ${userCount}`);
    
    if (userCount === 0) {
      console.log('❌ No users found! Database needs seeding.\n');
      return false;
    }
    
    // 4. List all users
    console.log('   Users in database:');
    const allUsers = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        password: true // We'll check if password exists
      }
    });
    
    allUsers.forEach(user => {
      console.log(`   - ${user.email} (${user.name}) - Role: ${user.role} - Has Password: ${!!user.password}`);
    });
    console.log('');
    
    // 5. Specifically check demo user
    console.log('4. Checking demo user (john@doe.com)...');
    const demoUser = await prisma.user.findUnique({
      where: { email: 'john@doe.com' }
    });
    
    if (!demoUser) {
      console.log('❌ Demo user not found!\n');
      return false;
    }
    
    console.log('✅ Demo user found:');
    console.log(`   ID: ${demoUser.id}`);
    console.log(`   Email: ${demoUser.email}`);
    console.log(`   Name: ${demoUser.name}`);
    console.log(`   Role: ${demoUser.role}`);
    console.log(`   Has Password: ${!!demoUser.password}`);
    console.log(`   Created: ${demoUser.createdAt}\n`);
    
    // 6. Test password verification
    console.log('5. Testing password verification...');
    if (!demoUser.password) {
      console.log('❌ Demo user has no password!\n');
      return false;
    }
    
    const testPassword = 'johndoe123';
    const isPasswordValid = await bcrypt.compare(testPassword, demoUser.password);
    console.log(`   Password '${testPassword}' is valid: ${isPasswordValid}`);
    
    if (!isPasswordValid) {
      console.log('❌ Demo user password does not match expected password!\n');
      return false;
    }
    
    console.log('✅ Password verification successful\n');
    
    // 7. Check workspaces for demo user
    console.log('6. Checking workspaces...');
    const workspaceCount = await prisma.workspace.count();
    console.log(`   Total workspaces: ${workspaceCount}`);
    
    const userWorkspaces = await prisma.workspace.findMany({
      where: { ownerId: demoUser.id },
      select: { id: true, name: true }
    });
    console.log(`   Workspaces owned by demo user: ${userWorkspaces.length}`);
    userWorkspaces.forEach(ws => {
      console.log(`   - ${ws.name} (${ws.id})`);
    });
    console.log('');
    
    // 8. Test a simple query that the app might use
    console.log('7. Testing authentication query simulation...');
    const authTestUser = await prisma.user.findUnique({
      where: { email: 'john@doe.com' }
    });
    
    if (authTestUser && authTestUser.password) {
      const authPasswordTest = await bcrypt.compare('johndoe123', authTestUser.password);
      console.log(`   Auth simulation result: ${authPasswordTest ? 'SUCCESS' : 'FAILED'}\n`);
    }
    
    console.log('🎉 All database checks passed! Database is ready for authentication.\n');
    return true;
    
  } catch (error) {
    console.error('❌ Database error:');
    console.error('   Error type:', error.constructor.name);
    console.error('   Error message:', error.message);
    if (error.code) {
      console.error('   Error code:', error.code);
    }
    console.error('   Stack trace:', error.stack);
    console.log('');
    return false;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the debug function
debugDatabase().then(success => {
  if (success) {
    console.log('✅ === DATABASE DEBUGGING COMPLETED SUCCESSFULLY ===');
    process.exit(0);
  } else {
    console.log('❌ === DATABASE DEBUGGING FOUND ISSUES ===');
    console.log('💡 Try running: npm run db:seed');
    process.exit(1);
  }
}).catch(error => {
  console.error('Critical error during database debugging:', error);
  process.exit(1);
});