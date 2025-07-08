#!/usr/bin/env node

const http = require('http');
const https = require('https');
const querystring = require('querystring');

// Test configuration
const BASE_URL = 'http://localhost:3000';
const TEST_CREDENTIALS = {
  email: 'john@doe.com',
  password: 'johndoe123'
};

function makeRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const protocol = options.protocol === 'https:' ? https : http;
    
    const req = protocol.request(options, (res) => {
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

async function testNextAuthEndpoints() {
  console.log('🔐 === NEXTAUTH API TESTING STARTED ===\n');
  
  try {
    // 1. Test NextAuth configuration endpoint
    console.log('1. Testing NextAuth configuration...');
    try {
      const configResponse = await makeRequest({
        hostname: 'localhost',
        port: 3000,
        path: '/api/auth/providers',
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });
      
      console.log(`   Status: ${configResponse.statusCode}`);
      if (configResponse.statusCode === 200) {
        const providers = JSON.parse(configResponse.body);
        console.log('✅ NextAuth providers endpoint working');
        console.log(`   Available providers: ${Object.keys(providers).join(', ')}`);
      } else {
        console.log('❌ NextAuth providers endpoint failed');
        console.log(`   Response: ${configResponse.body}`);
      }
    } catch (error) {
      console.log(`❌ NextAuth providers test failed: ${error.message}`);
    }
    console.log('');
    
    // 2. Test CSRF token endpoint
    console.log('2. Testing CSRF token...');
    try {
      const csrfResponse = await makeRequest({
        hostname: 'localhost',
        port: 3000,
        path: '/api/auth/csrf',
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });
      
      console.log(`   Status: ${csrfResponse.statusCode}`);
      if (csrfResponse.statusCode === 200) {
        const csrfData = JSON.parse(csrfResponse.body);
        console.log('✅ CSRF token endpoint working');
        console.log(`   CSRF Token: ${csrfData.csrfToken ? 'Present' : 'Missing'}`);
      } else {
        console.log('❌ CSRF token endpoint failed');
      }
    } catch (error) {
      console.log(`❌ CSRF token test failed: ${error.message}`);
    }
    console.log('');
    
    // 3. Test credentials signin
    console.log('3. Testing credentials signin...');
    try {
      // First get CSRF token
      const csrfResponse = await makeRequest({
        hostname: 'localhost',
        port: 3000,
        path: '/api/auth/csrf',
        method: 'GET'
      });
      
      let csrfToken = '';
      if (csrfResponse.statusCode === 200) {
        const csrfData = JSON.parse(csrfResponse.body);
        csrfToken = csrfData.csrfToken;
      }
      
      // Prepare signin data
      const signinData = querystring.stringify({
        email: TEST_CREDENTIALS.email,
        password: TEST_CREDENTIALS.password,
        csrfToken: csrfToken,
        callbackUrl: '/dashboard',
        json: 'true'
      });
      
      const signinResponse = await makeRequest({
        hostname: 'localhost',
        port: 3000,
        path: '/api/auth/callback/credentials',
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(signinData),
          'Accept': 'application/json'
        }
      }, signinData);
      
      console.log(`   Status: ${signinResponse.statusCode}`);
      console.log(`   Response body: ${signinResponse.body.substring(0, 200)}...`);
      
      if (signinResponse.statusCode === 200) {
        console.log('✅ Credentials signin endpoint accessible');
        
        // Try to parse response
        try {
          const signinResult = JSON.parse(signinResponse.body);
          if (signinResult.url) {
            console.log(`   Redirect URL: ${signinResult.url}`);
          }
          if (signinResult.error) {
            console.log(`   Error: ${signinResult.error}`);
          }
        } catch (parseError) {
          console.log('   Response is not JSON (might be HTML redirect)');
        }
      } else {
        console.log('❌ Credentials signin failed');
      }
    } catch (error) {
      console.log(`❌ Credentials signin test failed: ${error.message}`);
    }
    console.log('');
    
    // 4. Test session endpoint
    console.log('4. Testing session endpoint...');
    try {
      const sessionResponse = await makeRequest({
        hostname: 'localhost',
        port: 3000,
        path: '/api/auth/session',
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });
      
      console.log(`   Status: ${sessionResponse.statusCode}`);
      if (sessionResponse.statusCode === 200) {
        console.log('✅ Session endpoint working');
        const sessionData = JSON.parse(sessionResponse.body);
        console.log(`   Current session: ${sessionData.user ? 'Authenticated' : 'Not authenticated'}`);
      } else {
        console.log('❌ Session endpoint failed');
      }
    } catch (error) {
      console.log(`❌ Session test failed: ${error.message}`);
    }
    console.log('');
    
    // 5. Test general API health
    console.log('5. Testing general API health...');
    try {
      const healthResponse = await makeRequest({
        hostname: 'localhost',
        port: 3000,
        path: '/api/auth/providers',
        method: 'GET'
      });
      
      if (healthResponse.statusCode === 200) {
        console.log('✅ API is responsive');
      } else {
        console.log(`❌ API health check failed: ${healthResponse.statusCode}`);
      }
    } catch (error) {
      console.log(`❌ API health check failed: ${error.message}`);
    }
    
    console.log('\n🎯 === NEXTAUTH API TESTING COMPLETED ===');
    
  } catch (error) {
    console.error('Critical error during auth testing:', error);
  }
}

// Check if server is running first
async function checkServerStatus() {
  try {
    const response = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/',
      method: 'GET'
    });
    
    if (response.statusCode === 200) {
      console.log('✅ Server is running on localhost:3000\n');
      return true;
    } else {
      console.log(`❌ Server responded with status: ${response.statusCode}\n`);
      return false;
    }
  } catch (error) {
    console.log(`❌ Server is not running or not accessible: ${error.message}\n`);
    return false;
  }
}

// Main execution
async function main() {
  const serverRunning = await checkServerStatus();
  if (!serverRunning) {
    console.log('💡 Please start the server first with: npm run dev');
    process.exit(1);
  }
  
  await testNextAuthEndpoints();
}

main().catch(console.error);