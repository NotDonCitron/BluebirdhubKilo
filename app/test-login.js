#!/usr/bin/env node

const http = require('http');

// Test homepage accessibility
function testHomepage() {
  return new Promise((resolve, reject) => {
    const req = http.get('http://localhost:3000', (res) => {
      console.log(`✓ Homepage Status: ${res.statusCode}`);
      if (res.statusCode === 200) {
        console.log('✅ Homepage accessible without redirect');
        resolve(true);
      } else {
        console.log(`❌ Homepage returned status: ${res.statusCode}`);
        resolve(false);
      }
    });
    
    req.on('error', (err) => {
      console.log(`❌ Homepage error: ${err.message}`);
      resolve(false);
    });
    
    req.setTimeout(5000, () => {
      console.log('❌ Homepage request timeout');
      req.destroy();
      resolve(false);
    });
  });
}

// Test login page accessibility
function testLoginPage() {
  return new Promise((resolve, reject) => {
    const req = http.get('http://localhost:3000/login', (res) => {
      console.log(`✓ Login Page Status: ${res.statusCode}`);
      if (res.statusCode === 200) {
        console.log('✅ Login page accessible');
        resolve(true);
      } else {
        console.log(`❌ Login page returned status: ${res.statusCode}`);
        resolve(false);
      }
    });
    
    req.on('error', (err) => {
      console.log(`❌ Login page error: ${err.message}`);
      resolve(false);
    });
    
    req.setTimeout(5000, () => {
      console.log('❌ Login page request timeout');
      req.destroy();
      resolve(false);
    });
  });
}

// Main test function
async function runTests() {
  console.log('🧪 Running Login Flow Tests...\n');
  
  try {
    // Test 1: Homepage
    console.log('1. Testing Homepage Access...');
    const homepageOk = await testHomepage();
    
    // Test 2: Login page
    console.log('\n2. Testing Login Page Access...');
    const loginPageOk = await testLoginPage();
    
    // Summary
    console.log('\n📊 Test Results:');
    console.log(`Homepage: ${homepageOk ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Login Page: ${loginPageOk ? '✅ PASS' : '❌ FAIL'}`);
    
    if (homepageOk && loginPageOk) {
      console.log('\n🎉 All basic connectivity tests passed!');
      console.log('\n📝 Manual testing steps:');
      console.log('1. Open http://localhost:3000 in browser');
      console.log('2. Click "Go to Login"');
      console.log('3. Use demo credentials: john@doe.com / johndoe123');
      console.log('4. Verify redirect to dashboard after login');
    } else {
      console.log('\n❌ Some tests failed. Check server status.');
    }
    
  } catch (error) {
    console.error('❌ Test error:', error.message);
  }
}

// Wait a moment for server to be ready, then run tests
setTimeout(runTests, 2000);