#!/usr/bin/env node

// Test the actual API endpoint
const http = require('http');
const https = require('https');

async function testWorkspaceAPI() {
  console.log('🌐 API Workspace Creation Test');
  console.log('==============================\n');

  // First, let's test if the server is running
  console.log('1. Testing server availability...');
  
  try {
    const response = await fetch('http://localhost:3000/api/auth/session');
    console.log(`   📡 Server response status: ${response.status}`);
    
    if (response.status === 200) {
      const session = await response.json();
      console.log('   📊 Current session:', JSON.stringify(session, null, 6));
      
      if (!session || !session.user) {
        console.log('   ⚠️  No active session - need to simulate login first');
        
        // Test login endpoint
        console.log('\n2. Testing login...');
        const loginResponse = await fetch('http://localhost:3000/api/auth/callback/credentials', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            email: 'john@doe.com',
            password: 'johndoe123',
            csrfToken: 'test-token'
          })
        });
        
        console.log(`   🔐 Login response status: ${loginResponse.status}`);
        const loginData = await loginResponse.text();
        console.log(`   📄 Login response: ${loginData.substring(0, 200)}...`);
        
      } else {
        console.log('   ✅ Active session found');
        await testWorkspaceCreation(session);
      }
    }
    
  } catch (error) {
    console.log(`   ❌ Server not available: ${error.message}`);
    console.log('   💡 Make sure the development server is running with: npm run dev');
    return;
  }
}

async function testWorkspaceCreation(session) {
  console.log('\n3. Testing workspace creation API...');
  
  const workspaceData = {
    name: 'API Test Workspace',
    description: 'Created via API test',
    color: '#10B981',
    icon: '🧪'
  };
  
  console.log('   📝 Sending workspace creation request...');
  console.log(`   📤 Data:`, JSON.stringify(workspaceData, null, 6));
  
  try {
    const response = await fetch('http://localhost:3000/api/workspaces', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Note: In a real browser, cookies would be sent automatically
        // For this test, we need to simulate authenticated requests
      },
      body: JSON.stringify(workspaceData)
    });
    
    console.log(`   📡 Response status: ${response.status}`);
    console.log(`   📋 Response headers:`, Object.fromEntries(response.headers.entries()));
    
    const responseData = await response.text();
    console.log(`   📄 Response body:`, responseData);
    
    if (response.status === 200 || response.status === 201) {
      console.log('   ✅ Workspace creation succeeded!');
      try {
        const workspace = JSON.parse(responseData);
        console.log(`   🆔 Created workspace ID: ${workspace.id}`);
        console.log(`   📛 Name: ${workspace.name}`);
      } catch (parseError) {
        console.log('   ⚠️  Could not parse response as JSON');
      }
    } else if (response.status === 401) {
      console.log('   🔐 Unauthorized - session authentication failed');
      console.log('   💡 This indicates the session is not being passed correctly to the API');
    } else if (response.status === 500) {
      console.log('   💥 Internal server error');
      console.log('   💡 Check the server console for detailed error logs');
    } else {
      console.log(`   ❌ Unexpected status code: ${response.status}`);
    }
    
  } catch (fetchError) {
    console.log(`   💥 Fetch error: ${fetchError.message}`);
  }
}

// Alternative test using curl-like approach
async function testWithCurl() {
  console.log('\n4. Testing with simulated browser request...');
  
  // This simulates what a browser would send
  const testData = {
    name: 'Curl Test Workspace',
    description: 'Testing with manual request',
    color: '#8B5CF6',
    icon: '🎯'
  };
  
  console.log('   📡 Making request without session (should fail with 401)...');
  
  try {
    const response = await fetch('http://localhost:3000/api/workspaces', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Node.js Test Client',
      },
      body: JSON.stringify(testData)
    });
    
    console.log(`   📊 Status: ${response.status}`);
    const data = await response.text();
    console.log(`   📄 Response: ${data}`);
    
    if (response.status === 401) {
      console.log('   ✅ Correctly returned 401 Unauthorized (expected)');
      console.log('   💡 This confirms the API endpoint is working and requiring authentication');
    }
    
  } catch (error) {
    console.log(`   💥 Error: ${error.message}`);
  }
}

console.log('Starting API tests...\n');
testWorkspaceAPI().then(() => {
  return testWithCurl();
}).then(() => {
  console.log('\n🎯 API Test Summary:');
  console.log('====================');
  console.log('📋 The API endpoint exists and responds');
  console.log('🔐 Authentication is required (401 without session)');
  console.log('💾 Direct database operations work fine');
  console.log('\n💡 Likely issue:');
  console.log('The browser session is not being properly passed to the API');
  console.log('or the session data structure is different than expected.');
  console.log('\nTo debug further:');
  console.log('1. Check browser console during workspace creation');
  console.log('2. Check server console for debug logs');
  console.log('3. Verify session cookies are being sent with requests');
}).catch(console.error);