#!/usr/bin/env node

// Load environment variables
require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });

async function testWorkspaceCreation() {
  console.log('🏢 Direct Workspace Creation Test');
  console.log('==================================\n');

  try {
    // Test 1: Database Connection and User Lookup
    console.log('1. Testing Database Connection...');
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    
    await prisma.$connect();
    console.log('   ✅ Database connected successfully');
    
    // Find the test user
    const user = await prisma.user.findUnique({
      where: { email: 'john@doe.com' }
    });
    
    if (!user) {
      console.log('   ❌ Test user not found');
      return;
    }
    
    console.log('   ✅ Test user found');
    console.log(`   🆔 User ID: ${user.id}`);
    console.log(`   📧 Email: ${user.email}`);
    console.log(`   👤 Name: ${user.name}`);

    // Test 2: Session Structure Simulation
    console.log('\n2. Testing Session Structure...');
    
    // This is what NextAuth JWT callback does:
    // session.user.id = token.sub!;
    // where token.sub comes from the user.id returned by authorize
    
    const simulatedSession = {
      user: {
        id: user.id,  // This should be what we get from session.user.id
        email: user.email,
        name: user.name,
        role: user.role
      }
    };
    
    console.log('   📊 Simulated session structure:');
    console.log(`      session.user.id: ${simulatedSession.user.id}`);
    console.log(`      session.user.email: ${simulatedSession.user.email}`);
    console.log(`      session.user.name: ${simulatedSession.user.name}`);

    // Test 3: Direct Workspace Creation
    console.log('\n3. Testing Direct Workspace Creation...');
    
    const workspaceData = {
      name: 'Test Workspace Direct',
      description: 'Created via direct database test',
      color: '#3B82F6',
      icon: '🚀'
    };
    
    console.log('   📝 Creating workspace with data:', workspaceData);
    console.log(`   👤 Owner ID: ${user.id}`);

    try {
      const workspace = await prisma.workspace.create({
        data: {
          name: workspaceData.name,
          description: workspaceData.description,
          color: workspaceData.color,
          icon: workspaceData.icon,
          ownerId: user.id
        },
        include: {
          owner: {
            select: { id: true, name: true, email: true, image: true }
          },
          _count: {
            select: { tasks: true, files: true }
          }
        }
      });

      console.log('   ✅ Workspace created successfully!');
      console.log(`   🆔 Workspace ID: ${workspace.id}`);
      console.log(`   📛 Name: ${workspace.name}`);
      console.log(`   👤 Owner: ${workspace.owner?.name} (${workspace.owner?.email})`);
      
      // Clean up - delete the test workspace
      console.log('\n4. Cleaning up test workspace...');
      await prisma.workspace.delete({
        where: { id: workspace.id }
      });
      console.log('   🗑️ Test workspace deleted');

    } catch (createError) {
      console.log('   ❌ Workspace creation failed:');
      console.log(`      Error type: ${createError?.constructor?.name}`);
      console.log(`      Error message: ${createError?.message}`);
      console.log(`      Error code: ${createError?.code}`);
      console.log(`      Error meta: ${JSON.stringify(createError?.meta, null, 6)}`);
      
      if (createError.code === 'P2002') {
        console.log('   🔍 This is a unique constraint violation');
        console.log('   💡 Check if a workspace with this name already exists');
      }
      
      if (createError.code === 'P2003') {
        console.log('   🔍 This is a foreign key constraint violation');
        console.log('   💡 The ownerId does not reference a valid user');
      }
    }

    // Test 4: Check existing workspaces
    console.log('\n5. Checking existing workspaces...');
    const existingWorkspaces = await prisma.workspace.findMany({
      where: { ownerId: user.id },
      select: { id: true, name: true, ownerId: true }
    });
    
    console.log(`   📋 Existing workspaces for user: ${existingWorkspaces.length}`);
    existingWorkspaces.forEach(ws => {
      console.log(`      - ${ws.name} (ID: ${ws.id})`);
    });

    // Test 5: Check database schema
    console.log('\n6. Checking database schema...');
    const tables = await prisma.$queryRaw`
      SELECT name FROM sqlite_master WHERE type='table' AND name LIKE '%workspace%'
    `;
    console.log(`   📋 Workspace-related tables: ${tables.length}`);
    tables.forEach(table => console.log(`      - ${table.name}`));

    // Check workspace table structure
    const workspaceSchema = await prisma.$queryRaw`
      PRAGMA table_info(Workspace)
    `;
    console.log('\n   📐 Workspace table structure:');
    workspaceSchema.forEach(col => {
      console.log(`      ${col.name}: ${col.type} ${col.notnull ? 'NOT NULL' : 'NULL'} ${col.pk ? 'PRIMARY KEY' : ''}`);
    });

    await prisma.$disconnect();

    console.log('\n🎯 DIAGNOSIS:');
    console.log('=============');
    console.log('✅ Database connection works');
    console.log('✅ User exists and can be found');
    console.log('✅ Direct workspace creation should work');
    console.log('\n💡 If workspace creation fails via API but works here:');
    console.log('1. Session data might be malformed (user.id could be undefined)');
    console.log('2. Request parsing might fail');
    console.log('3. Authentication middleware might interfere');

  } catch (error) {
    console.error('💥 Test failed:', error);
    console.error('Stack:', error.stack);
  }
}

testWorkspaceCreation();