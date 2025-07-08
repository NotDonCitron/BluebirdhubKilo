#!/usr/bin/env node

const http = require('http');
const https = require('https');

class ComprehensiveLoginTester {
  constructor() {
    this.baseUrl = 'http://localhost:3000';
    this.credentials = {
      email: 'john@doe.com',
      password: 'johndoe123'
    };
    this.cookies = new Map();
    this.testResults = [];
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = {
      'info': '📝',
      'success': '✅',
      'error': '❌',
      'warning': '⚠️',
      'debug': '🔍'
    }[type] || '📝';
    
    const logEntry = `${prefix} [${timestamp}] ${message}`;
    console.log(logEntry);
    this.testResults.push({ timestamp, type, message });
  }

  storeCookies(headers) {
    const setCookieHeader = headers['set-cookie'];
    if (setCookieHeader) {
      setCookieHeader.forEach(cookie => {
        const [nameValue] = cookie.split(';');
        const [name, value] = nameValue.split('=');
        if (name && value) {
          this.cookies.set(name.trim(), value);
          this.log(`Cookie stored: ${name.trim()}`, 'debug');
        }
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
          'User-Agent': 'ComprehensiveLoginTester/1.0',
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
        if (typeof body === 'object' && !Buffer.isBuffer(body)) {
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
            cookies: new Map(this.cookies)
          });
        });
      });

      req.on('error', reject);
      req.setTimeout(15000, () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });

      if (body) {
        req.write(body);
      }
      req.end();
    });
  }

  async testServerHealth() {
    this.log('Testing server health and accessibility...', 'info');
    
    try {
      const response = await this.makeRequest('/');
      
      if (response.statusCode === 200) {
        this.log('Server is responding correctly', 'success');
        
        // Check if homepage contains expected content
        if (response.body.includes('AbacusHub is Working')) {
          this.log('Homepage content verified', 'success');
        } else {
          this.log('Homepage content unexpected', 'warning');
        }
        
        return true;
      } else {
        this.log(`Server responded with status ${response.statusCode}`, 'error');
        return false;
      }
    } catch (error) {
      this.log(`Server health check failed: ${error.message}`, 'error');
      return false;
    }
  }

  async testNextAuthEndpoints() {
    this.log('Testing NextAuth endpoint accessibility...', 'info');
    
    try {
      // Test providers endpoint
      const providersResponse = await this.makeRequest('/api/auth/providers');
      
      if (providersResponse.statusCode === 200) {
        const providers = JSON.parse(providersResponse.body);
        this.log(`NextAuth providers available: ${Object.keys(providers).join(', ')}`, 'success');
        
        if (providers.credentials) {
          this.log('Credentials provider is configured', 'success');
          return true;
        } else {
          this.log('Credentials provider not found', 'error');
          return false;
        }
      } else {
        this.log(`NextAuth providers endpoint failed: ${providersResponse.statusCode}`, 'error');
        return false;
      }
    } catch (error) {
      this.log(`NextAuth endpoint test failed: ${error.message}`, 'error');
      return false;
    }
  }

  async testCSRFToken() {
    this.log('Getting CSRF token from NextAuth...', 'info');
    
    try {
      const csrfResponse = await this.makeRequest('/api/auth/csrf');
      
      if (csrfResponse.statusCode === 200) {
        const csrfData = JSON.parse(csrfResponse.body);
        
        if (csrfData.csrfToken) {
          this.log('CSRF token obtained successfully', 'success');
          this.log(`CSRF token: ${csrfData.csrfToken.substring(0, 20)}...`, 'debug');
          return csrfData.csrfToken;
        } else {
          this.log('CSRF response missing token', 'error');
          return null;
        }
      } else {
        this.log(`CSRF endpoint failed: ${csrfResponse.statusCode}`, 'error');
        return null;
      }
    } catch (error) {
      this.log(`CSRF token request failed: ${error.message}`, 'error');
      return null;
    }
  }

  async testLoginPage() {
    this.log('Testing login page accessibility...', 'info');
    
    try {
      const loginPageResponse = await this.makeRequest('/login');
      
      if (loginPageResponse.statusCode === 200) {
        this.log('Login page accessible', 'success');
        
        // Check for form elements
        const hasEmailField = loginPageResponse.body.includes('type="email"') || 
                             loginPageResponse.body.includes('login-email');
        const hasPasswordField = loginPageResponse.body.includes('type="password"') || 
                                loginPageResponse.body.includes('login-password');
        
        if (hasEmailField && hasPasswordField) {
          this.log('Login form elements detected', 'success');
        } else {
          this.log('Login form elements missing', 'warning');
        }
        
        return true;
      } else {
        this.log(`Login page failed: ${loginPageResponse.statusCode}`, 'error');
        return false;
      }
    } catch (error) {
      this.log(`Login page test failed: ${error.message}`, 'error');
      return false;
    }
  }

  async attemptLogin(csrfToken) {
    this.log('Attempting login with credentials...', 'info');
    this.log(`Email: ${this.credentials.email}`, 'debug');
    this.log(`Password: ${'*'.repeat(this.credentials.password.length)}`, 'debug');
    
    try {
      // Prepare form data exactly like browser would
      const formData = new URLSearchParams({
        email: this.credentials.email,
        password: this.credentials.password,
        csrfToken: csrfToken,
        callbackUrl: '/dashboard'
      }).toString();

      this.log('Submitting credentials to NextAuth...', 'info');

      const loginResponse = await this.makeRequest('/api/auth/callback/credentials', 'POST', formData, {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
        'Referer': `${this.baseUrl}/login`
      });

      this.log(`Login response status: ${loginResponse.statusCode}`, 'debug');
      this.log(`Response headers: ${JSON.stringify(loginResponse.headers, null, 2)}`, 'debug');

      if (loginResponse.statusCode === 302) {
        const location = loginResponse.headers.location;
        this.log(`Redirect location: ${location}`, 'debug');

        if (location && location.includes('/dashboard')) {
          this.log('Login successful - redirected to dashboard', 'success');
          return { success: true, redirectUrl: location };
        } else if (location && location.includes('error=CredentialsSignin')) {
          this.log('Login failed - credentials rejected by NextAuth', 'error');
          return { success: false, error: 'CredentialsSignin', redirectUrl: location };
        } else if (location && location.includes('csrf')) {
          this.log('Login failed - CSRF token issue', 'error');
          return { success: false, error: 'CSRF', redirectUrl: location };
        } else {
          this.log(`Unexpected redirect: ${location}`, 'warning');
          return { success: false, error: 'UnexpectedRedirect', redirectUrl: location };
        }
      } else if (loginResponse.statusCode === 200) {
        // Try to parse JSON response
        try {
          const jsonResponse = JSON.parse(loginResponse.body);
          this.log(`JSON response: ${JSON.stringify(jsonResponse, null, 2)}`, 'debug');
          
          if (jsonResponse.url) {
            if (jsonResponse.url.includes('/dashboard')) {
              this.log('Login successful via JSON response', 'success');
              return { success: true, redirectUrl: jsonResponse.url };
            } else {
              this.log('Login failed via JSON response', 'error');
              return { success: false, error: 'JSONRedirectError', redirectUrl: jsonResponse.url };
            }
          }
        } catch (e) {
          this.log('Response is not JSON', 'debug');
        }
        
        this.log(`Unexpected 200 response: ${loginResponse.body.substring(0, 200)}`, 'warning');
        return { success: false, error: 'Unexpected200', body: loginResponse.body };
      } else {
        this.log(`Unexpected status code: ${loginResponse.statusCode}`, 'error');
        return { success: false, error: 'UnexpectedStatus', statusCode: loginResponse.statusCode };
      }
    } catch (error) {
      this.log(`Login attempt failed: ${error.message}`, 'error');
      return { success: false, error: 'NetworkError', message: error.message };
    }
  }

  async testSessionAfterLogin() {
    this.log('Testing session after login...', 'info');
    
    try {
      const sessionResponse = await this.makeRequest('/api/auth/session');
      
      if (sessionResponse.statusCode === 200) {
        const sessionData = JSON.parse(sessionResponse.body);
        
        if (sessionData.user) {
          this.log(`Session active for user: ${sessionData.user.email}`, 'success');
          this.log(`User name: ${sessionData.user.name}`, 'debug');
          this.log(`User role: ${sessionData.user.role}`, 'debug');
          return true;
        } else {
          this.log('Session exists but no user data', 'warning');
          return false;
        }
      } else {
        this.log(`Session check failed: ${sessionResponse.statusCode}`, 'error');
        return false;
      }
    } catch (error) {
      this.log(`Session test failed: ${error.message}`, 'error');
      return false;
    }
  }

  async runComprehensiveTest() {
    console.log('🚀 Starting Comprehensive Login Test');
    console.log('=====================================\n');

    let testsPassed = 0;
    let totalTests = 0;

    // Test 1: Server Health
    totalTests++;
    if (await this.testServerHealth()) {
      testsPassed++;
    }

    console.log('');

    // Test 2: NextAuth Endpoints
    totalTests++;
    if (await this.testNextAuthEndpoints()) {
      testsPassed++;
    }

    console.log('');

    // Test 3: Login Page
    totalTests++;
    if (await this.testLoginPage()) {
      testsPassed++;
    }

    console.log('');

    // Test 4: CSRF Token
    totalTests++;
    const csrfToken = await this.testCSRFToken();
    if (csrfToken) {
      testsPassed++;
    }

    console.log('');

    // Test 5: Login Attempt
    if (csrfToken) {
      totalTests++;
      this.log('🔐 CRITICAL TEST: Attempting actual login...', 'warning');
      console.log('⚠️  WATCH YOUR SERVER CONSOLE FOR DEBUG LOGS NOW!');
      console.log('    Look for: "🔐 NextAuth authorize called with:"');
      console.log('    Look for: "👤 User lookup result:"');
      console.log('    Look for: "🔑 Password validation:"\n');

      const loginResult = await this.attemptLogin(csrfToken);
      
      if (loginResult.success) {
        testsPassed++;
        
        // Test 6: Session after login
        totalTests++;
        if (await this.testSessionAfterLogin()) {
          testsPassed++;
        }
      } else {
        this.log(`Login failed with error: ${loginResult.error}`, 'error');
        if (loginResult.redirectUrl) {
          this.log(`Error redirect URL: ${loginResult.redirectUrl}`, 'error');
        }
      }
    }

    console.log('\n🎯 TEST RESULTS SUMMARY');
    console.log('======================');
    console.log(`Tests passed: ${testsPassed}/${totalTests}`);
    console.log(`Success rate: ${Math.round((testsPassed/totalTests) * 100)}%`);

    if (testsPassed === totalTests) {
      console.log('🎉 ALL TESTS PASSED - Login should work!');
    } else {
      console.log('❌ SOME TESTS FAILED - This explains the login issue');
      
      console.log('\n💡 WHAT TO CHECK:');
      console.log('1. Did you see debug logs in server console during login attempt?');
      console.log('2. If no debug logs: NextAuth authorize function is not being called');
      console.log('3. If debug logs show user not found: Database connection issue');
      console.log('4. If debug logs show invalid password: Password hash issue');
      console.log('5. If no debug logs at all: NextAuth configuration problem');
    }

    return testsPassed === totalTests;
  }
}

// Run the comprehensive test
const tester = new ComprehensiveLoginTester();
tester.runComprehensiveTest().catch(console.error);