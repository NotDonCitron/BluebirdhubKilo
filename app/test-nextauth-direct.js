#!/usr/bin/env node

const http = require('http');

function makeRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    });

    req.on('error', reject);
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

async function testNextAuthDirect() {
  console.log('🧪 Direct NextAuth Test\n');
  
  try {
    // Test 1: Check if NextAuth is responding
    console.log('1. Testing NextAuth providers endpoint...');
    const providersResponse = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/auth/providers',
      method: 'GET'
    });
    
    console.log(`   Status: ${providersResponse.statusCode}`);
    if (providersResponse.statusCode === 200) {
      console.log('✅ NextAuth is responding');
      const providers = JSON.parse(providersResponse.body);
      console.log(`   Available providers: ${Object.keys(providers).join(', ')}`);
    } else {
      console.log('❌ NextAuth providers endpoint failed');
      return;
    }
    
    // Test 2: Try to use the credentials provider directly
    console.log('\n2. Testing credentials via signin endpoint...');
    
    const signinBody = JSON.stringify({
      email: 'john@doe.com',
      password: 'johndoe123',
      redirect: false
    });
    
    const signinResponse = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/auth/signin/credentials',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    }, signinBody);
    
    console.log(`   Status: ${signinResponse.statusCode}`);
    console.log(`   Response: ${signinResponse.body.substring(0, 200)}...`);
    
    if (signinResponse.headers.location) {
      console.log(`   Redirect: ${signinResponse.headers.location}`);
    }
    
    // Test 3: Try a different approach - test with form data
    console.log('\n3. Testing with form data (browser-like)...');
    
    const formData = new URLSearchParams({
      email: 'john@doe.com',
      password: 'johndoe123',
      json: 'true'
    }).toString();
    
    const formResponse = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/auth/signin/credentials',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      }
    }, formData);
    
    console.log(`   Status: ${formResponse.statusCode}`);
    console.log(`   Response: ${formResponse.body.substring(0, 200)}...`);
    
    if (formResponse.headers.location) {
      console.log(`   Redirect: ${formResponse.headers.location}`);
    }
    
    // Test 4: Check what happens with invalid credentials
    console.log('\n4. Testing with invalid credentials (should fail)...');
    
    const invalidFormData = new URLSearchParams({
      email: 'john@doe.com',
      password: 'wrongpassword',
      json: 'true'
    }).toString();
    
    const invalidResponse = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/auth/signin/credentials',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      }
    }, invalidFormData);
    
    console.log(`   Status: ${invalidResponse.statusCode}`);
    console.log(`   Response: ${invalidResponse.body.substring(0, 200)}...`);
    
    if (invalidResponse.headers.location) {
      console.log(`   Redirect: ${invalidResponse.headers.location}`);
      
      if (invalidResponse.headers.location.includes('error=CredentialsSignin')) {
        console.log('✅ Invalid credentials correctly rejected');
      }
    }
    
    console.log('\n🎯 Analysis:');
    console.log('- If valid credentials also redirect to error, there\'s an auth config issue');
    console.log('- If valid credentials succeed but browser login fails, it\'s a CSRF/session issue');
    console.log('- Check server console for the debug logs we added to auth-config.ts');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testNextAuthDirect();