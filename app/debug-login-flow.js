#!/usr/bin/env node

const http = require('http');
const { URL } = require('url');

class LoginFlowTester {
  constructor() {
    this.baseUrl = 'http://localhost:3000';
    this.cookies = new Map();
    this.testCredentials = {
      email: 'john@doe.com',
      password: 'johndoe123'
    };
  }

  // Helper to manage cookies
  storeCookies(headers) {
    const setCookieHeader = headers['set-cookie'];
    if (setCookieHeader) {
      setCookieHeader.forEach(cookie => {
        const [nameValue] = cookie.split(';');
        const [name, value] = nameValue.split('=');
        this.cookies.set(name.trim(), value);
      });
    }
  }

  getCookieHeader() {
    const cookieArray = Array.from(this.cookies.entries())
      .map(([name, value]) => `${name}=${value}`);
    return cookieArray.length > 0 ? cookieArray.join('; ') : '';
  }

  makeRequest(path, method = 'GET', body = null, headers = {}) {
    return new Promise((resolve, reject) => {
      const url = new URL(path, this.baseUrl);
      
      const options = {
        hostname: url.hostname,
        port: url.port || 3000,
        path: url.pathname + url.search,
        method: method,
        headers: {
          'User-Agent': 'LoginFlowTester/1.0',
          'Accept': 'application/json, text/html, */*',
          ...headers
        }
      };

      // Add cookies
      const cookieHeader = this.getCookieHeader();
      if (cookieHeader) {
        options.headers['Cookie'] = cookieHeader;
      }

      if (body) {
        if (typeof body === 'object') {
          body = JSON.stringify(body);
          options.headers['Content-Type'] = 'application/json';
        }
        options.headers['Content-Length'] = Buffer.byteLength(body);
      }

      const req = http.request(options, (res) => {
        this.storeCookies(res.headers);
        
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: data,
            cookies: this.cookies
          });
        });
      });

      req.on('error', reject);
      req.setTimeout(10000, () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });

      if (body) {
        req.write(body);
      }
      req.end();
    });
  }

  async testCompleteLoginFlow() {
    console.log('🚀 === COMPLETE LOGIN FLOW TEST STARTED ===\n');
    
    try {
      // Step 1: Access homepage
      console.log('1. Accessing homepage...');
      const homeResponse = await this.makeRequest('/');
      console.log(`   Status: ${homeResponse.statusCode}`);
      console.log(`   Cookies received: ${this.cookies.size}`);
      if (homeResponse.statusCode !== 200) {
        console.log(`❌ Homepage failed: ${homeResponse.body.substring(0, 100)}`);
        return false;
      }
      console.log('✅ Homepage accessible\n');

      // Step 2: Access login page
      console.log('2. Accessing login page...');
      const loginPageResponse = await this.makeRequest('/login');
      console.log(`   Status: ${loginPageResponse.statusCode}`);
      console.log(`   Total cookies: ${this.cookies.size}`);
      if (loginPageResponse.statusCode !== 200) {
        console.log(`❌ Login page failed: ${loginPageResponse.body.substring(0, 100)}`);
        return false;
      }
      console.log('✅ Login page accessible\n');

      // Step 3: Get CSRF token
      console.log('3. Getting CSRF token...');
      const csrfResponse = await this.makeRequest('/api/auth/csrf');
      console.log(`   Status: ${csrfResponse.statusCode}`);
      
      let csrfToken = '';
      if (csrfResponse.statusCode === 200) {
        try {
          const csrfData = JSON.parse(csrfResponse.body);
          csrfToken = csrfData.csrfToken;
          console.log(`   CSRF Token: ${csrfToken ? 'Received' : 'Missing'}`);
        } catch (e) {
          console.log('❌ Failed to parse CSRF response');
          return false;
        }
      } else {
        console.log('❌ CSRF token request failed');
        return false;
      }
      console.log('✅ CSRF token obtained\n');

      // Step 4: Test the actual NextAuth signin endpoint
      console.log('4. Testing NextAuth signin (mimicking browser)...');
      
      // First, let's try the NextAuth signin endpoint directly
      const signinBody = new URLSearchParams({
        email: this.testCredentials.email,
        password: this.testCredentials.password,
        csrfToken: csrfToken,
        callbackUrl: '/dashboard'
      }).toString();

      const signinResponse = await this.makeRequest('/api/auth/callback/credentials', 'POST', signinBody, {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
        'Referer': `${this.baseUrl}/login`
      });

      console.log(`   Status: ${signinResponse.statusCode}`);
      console.log(`   Headers: ${JSON.stringify(signinResponse.headers, null, 2)}`);
      console.log(`   Response body (first 300 chars): ${signinResponse.body.substring(0, 300)}`);
      
      // Check for redirect or success
      if (signinResponse.statusCode === 302 || signinResponse.statusCode === 200) {
        const location = signinResponse.headers.location;
        if (location) {
          console.log(`   Redirect to: ${location}`);
          
          // Follow redirect if it's to dashboard
          if (location.includes('/dashboard')) {
            console.log('✅ Login successful - redirecting to dashboard');
            
            // Step 5: Test dashboard access
            console.log('\n5. Testing dashboard access...');
            const dashboardResponse = await this.makeRequest('/dashboard');
            console.log(`   Status: ${dashboardResponse.statusCode}`);
            
            if (dashboardResponse.statusCode === 200) {
              console.log('✅ Dashboard accessible after login');
              
              // Step 6: Test session
              console.log('\n6. Verifying session...');
              const sessionResponse = await this.makeRequest('/api/auth/session');
              console.log(`   Status: ${sessionResponse.statusCode}`);
              
              if (sessionResponse.statusCode === 200) {
                try {
                  const sessionData = JSON.parse(sessionResponse.body);
                  if (sessionData.user) {
                    console.log(`✅ User authenticated: ${sessionData.user.email}`);
                    console.log(`   User name: ${sessionData.user.name}`);
                    console.log(`   User role: ${sessionData.user.role}`);
                    return true;
                  } else {
                    console.log('❌ Session exists but no user data');
                    return false;
                  }
                } catch (e) {
                  console.log('❌ Failed to parse session response');
                  return false;
                }
              } else {
                console.log('❌ Session check failed');
                return false;
              }
            } else {
              console.log('❌ Dashboard not accessible after login');
              return false;
            }
          } else {
            console.log(`❌ Unexpected redirect: ${location}`);
            return false;
          }
        } else {
          console.log('❌ No redirect location provided');
          return false;
        }
      } else {
        console.log('❌ Login request failed');
        
        // Try to parse error response
        try {
          const errorData = JSON.parse(signinResponse.body);
          console.log(`   Error details: ${JSON.stringify(errorData, null, 2)}`);
        } catch (e) {
          console.log(`   Raw error response: ${signinResponse.body}`);
        }
        return false;
      }

    } catch (error) {
      console.error('❌ Critical error during login flow test:', error);
      return false;
    }
  }

  async testDirectCredentialsAuth() {
    console.log('\n🔐 === DIRECT CREDENTIALS TEST ===\n');
    
    // This tests our auth configuration directly
    try {
      // Import and test auth configuration
      const { PrismaClient } = require('@prisma/client');
      const bcrypt = require('bcryptjs');
      
      const prisma = new PrismaClient();
      
      console.log('Testing direct credential verification...');
      
      // Find user
      const user = await prisma.user.findUnique({
        where: { email: this.testCredentials.email }
      });
      
      if (!user) {
        console.log('❌ User not found');
        return false;
      }
      
      // Verify password
      const isValid = await bcrypt.compare(this.testCredentials.password, user.password);
      console.log(`Password verification: ${isValid ? '✅ VALID' : '❌ INVALID'}`);
      
      await prisma.$disconnect();
      return isValid;
      
    } catch (error) {
      console.error('❌ Direct auth test failed:', error);
      return false;
    }
  }
}

// Main execution
async function main() {
  const tester = new LoginFlowTester();
  
  // Test 1: Direct credentials
  const directAuthWorking = await tester.testDirectCredentialsAuth();
  
  // Test 2: Complete flow
  const loginFlowWorking = await tester.testCompleteLoginFlow();
  
  console.log('\n🎯 === FINAL RESULTS ===');
  console.log(`Direct Authentication: ${directAuthWorking ? '✅ WORKING' : '❌ FAILED'}`);
  console.log(`Complete Login Flow: ${loginFlowWorking ? '✅ WORKING' : '❌ FAILED'}`);
  
  if (!directAuthWorking) {
    console.log('\n💡 Issue is with database/password verification');
  } else if (!loginFlowWorking) {
    console.log('\n💡 Issue is with NextAuth configuration or API endpoints');
    console.log('   - Check NextAuth configuration in lib/auth-config.ts');
    console.log('   - Verify environment variables');
    console.log('   - Check middleware configuration');
  } else {
    console.log('\n🎉 Everything is working! The issue might be browser-specific.');
  }
}

main().catch(console.error);