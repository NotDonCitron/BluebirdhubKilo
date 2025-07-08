#!/usr/bin/env node

const http = require('http');

function testLogin() {
  console.log('🔐 Testing login with server console monitoring...\n');
  console.log('💡 Watch your server console for debug logs!\n');
  
  // Get CSRF token first
  const csrfReq = http.get('http://localhost:3000/api/auth/csrf', (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      if (res.statusCode === 200) {
        const csrfData = JSON.parse(data);
        const csrfToken = csrfData.csrfToken;
        
        console.log('✅ CSRF token obtained');
        console.log('🔄 Attempting login...');
        console.log('👀 Check your server console for auth debug logs!\n');
        
        // Now attempt login
        const postData = new URLSearchParams({
          email: 'john@doe.com',
          password: 'johndoe123',
          csrfToken: csrfToken,
          callbackUrl: '/dashboard'
        }).toString();
        
        const options = {
          hostname: 'localhost',
          port: 3000,
          path: '/api/auth/callback/credentials',
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': Buffer.byteLength(postData)
          }
        };
        
        const loginReq = http.request(options, (loginRes) => {
          let loginData = '';
          loginRes.on('data', chunk => loginData += chunk);
          loginRes.on('end', () => {
            console.log(`📊 Login Response Status: ${loginRes.statusCode}`);
            console.log(`📍 Location Header: ${loginRes.headers.location || 'None'}`);
            
            if (loginRes.statusCode === 302) {
              const location = loginRes.headers.location;
              if (location && location.includes('error')) {
                console.log('❌ Login failed - redirected to error page');
                console.log(`🔗 Error URL: ${location}`);
              } else if (location && location.includes('dashboard')) {
                console.log('✅ Login successful - redirected to dashboard');
              } else {
                console.log('❓ Unexpected redirect:', location);
              }
            } else {
              console.log('❓ Unexpected response status');
            }
            
            console.log('\n💡 Key things to check in server console:');
            console.log('  - "🔐 NextAuth authorize called with:" - should show email');
            console.log('  - "👤 User lookup result:" - should show found: true');
            console.log('  - "🔑 Password validation:" - should show isValid: true');
            console.log('  - Any error messages or exceptions');
          });
        });
        
        loginReq.on('error', (error) => {
          console.error('❌ Login request failed:', error);
        });
        
        loginReq.write(postData);
        loginReq.end();
        
      } else {
        console.error('❌ Failed to get CSRF token');
      }
    });
  });
  
  csrfReq.on('error', (error) => {
    console.error('❌ CSRF request failed:', error);
  });
}

console.log('🧪 Login Test with Console Monitoring');
console.log('=====================================');
console.log('This will attempt a login and show you what to look for in the server console.\n');

testLogin();