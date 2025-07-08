/**
 * AbacusHub Test Environment Validator
 * 
 * This script validates the test environment and diagnoses common issues
 * that might cause integration tests to fail.
 */

import fs from 'fs';
import path from 'path';
import http from 'http';
import puppeteer from 'puppeteer';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const config = {
  // Server configuration
  serverPort: 3000, // Should match the port in integration tests
  serverBaseUrl: 'http://localhost:3000',
  
  // Test configuration 
  screenshotDir: path.join(__dirname, 'screenshots'),
  testTimeout: 30000,
  
  // Puppeteer configuration
  puppeteerOptions: {
    headless: false,
    defaultViewport: { width: 1280, height: 800 },
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    timeout: 30000
  }
};

// Create screenshot directory if it doesn't exist
if (!fs.existsSync(config.screenshotDir)) {
  fs.mkdirSync(config.screenshotDir, { recursive: true });
}

/**
 * Validates the test environment and reports issues
 */
async function validateTestEnvironment() {
  console.log('🔍 AbacusHub Test Environment Validator');
  console.log('=======================================');

  let browser;
  let page;
  
  try {
    // Step 1: Check if server is running
    console.log('\n📡 Checking if server is running...');
    const serverRunning = await checkServerRunning(config.serverPort);
    
    if (!serverRunning) {
      console.error('❌ Server is not running on port', config.serverPort);
      console.log('   Please start the server with: npm run dev');
      return false;
    }
    
    console.log('✅ Server is running on port', config.serverPort);
    
    // Step 2: Launch browser and check accessibility
    console.log('\n🌐 Launching browser to check application accessibility...');
    browser = await puppeteer.launch(config.puppeteerOptions);
    page = await browser.newPage();
    
    // Navigate to the application
    console.log('   Navigating to', config.serverBaseUrl);
    await page.goto(config.serverBaseUrl, { waitUntil: 'networkidle2', timeout: config.testTimeout });
    
    // Take a screenshot
    await page.screenshot({ path: path.join(config.screenshotDir, 'homepage.png') });
    console.log('✅ Successfully accessed the application');
    console.log('   Screenshot saved to:', path.join(config.screenshotDir, 'homepage.png'));
    
    // Step 3: Check for login form
    console.log('\n🔑 Checking for login form...');
    const loginFormExists = await checkLoginForm(page);
    
    if (!loginFormExists) {
      console.warn('⚠️ Login form not found. This may indicate a configuration issue.');
    } else {
      console.log('✅ Login form found');
    }
    
    // Step 4: Test login functionality
    console.log('\n👤 Testing login functionality...');
    const loginSuccess = await testLogin(page);
    
    if (!loginSuccess) {
      console.error('❌ Login test failed. This will cause all integration tests to fail.');
    } else {
      console.log('✅ Login test succeeded');
    }
    
    // Step 5: Check dashboard loading
    console.log('\n📊 Checking dashboard loading...');
    const dashboardLoaded = await checkDashboard(page);
    
    if (!dashboardLoaded) {
      console.error('❌ Dashboard not loaded. This will cause workspace tests to fail.');
    } else {
      console.log('✅ Dashboard loaded successfully');
    }
    
    // Step 6: Check for common modal issues
    console.log('\n🪟 Testing modal functionality...');
    const modalWorks = await testModal(page);
    
    if (!modalWorks) {
      console.error('❌ Modal test failed. This may cause task creation tests to fail.');
    } else {
      console.log('✅ Modal functionality works');
    }
    
    // Step 7: Verify form submission
    console.log('\n📝 Testing form submission...');
    const formSubmissionWorks = await testFormSubmission(page);
    
    if (!formSubmissionWorks) {
      console.error('❌ Form submission test failed. This may cause creation tests to fail.');
    } else {
      console.log('✅ Form submission works');
    }
    
    // Step 8: Check for JavaScript errors
    console.log('\n🐞 Checking for JavaScript errors...');
    const jsErrors = await checkJavaScriptErrors(page);
    
    if (jsErrors.length > 0) {
      console.error('❌ JavaScript errors detected:');
      jsErrors.forEach((error, index) => {
        console.error(`   ${index + 1}. ${error}`);
      });
    } else {
      console.log('✅ No JavaScript errors detected');
    }
    
    // Step 9: Check network issues
    console.log('\n🌍 Checking for network issues...');
    const networkIssues = await checkNetworkIssues(page);
    
    if (networkIssues.length > 0) {
      console.error('❌ Network issues detected:');
      networkIssues.forEach((issue, index) => {
        console.error(`   ${index + 1}. ${issue}`);
      });
    } else {
      console.log('✅ No network issues detected');
    }
    
    // Final report
    console.log('\n📋 Test Environment Validation Summary');
    console.log('=====================================');
    console.log('Server running:       ', serverRunning ? '✅' : '❌');
    console.log('Application accessible:', true ? '✅' : '❌');
    console.log('Login form found:     ', loginFormExists ? '✅' : '⚠️');
    console.log('Login functionality:  ', loginSuccess ? '✅' : '❌');
    console.log('Dashboard loads:      ', dashboardLoaded ? '✅' : '❌');
    console.log('Modal functionality:  ', modalWorks ? '✅' : '❌');
    console.log('Form submission:      ', formSubmissionWorks ? '✅' : '❌');
    console.log('JavaScript errors:    ', jsErrors.length === 0 ? '✅' : '❌');
    console.log('Network issues:       ', networkIssues.length === 0 ? '✅' : '❌');
    
    // Overall assessment
    const criticalIssues = !serverRunning || !loginSuccess || !dashboardLoaded;
    const minorIssues = !loginFormExists || !modalWorks || !formSubmissionWorks || 
                         jsErrors.length > 0 || networkIssues.length > 0;
    
    console.log('\n🏁 Overall Assessment');
    if (criticalIssues) {
      console.error('❌ Critical issues detected that will cause integration tests to fail.');
      console.log('   Please fix these issues before running integration tests.');
    } else if (minorIssues) {
      console.warn('⚠️ Minor issues detected that may cause some integration tests to fail.');
      console.log('   Consider fixing these issues for more reliable test results.');
    } else {
      console.log('✅ Test environment looks good! Integration tests should run properly.');
    }
    
    return !criticalIssues;
  } catch (error) {
    console.error('❌ Error during environment validation:', error.message);
    return false;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

/**
 * Checks if the server is running on the specified port
 */
async function checkServerRunning(port) {
  return new Promise((resolve) => {
    const request = http.get(`http://localhost:${port}`, (response) => {
      resolve(response.statusCode < 400);
      response.resume();
    });
    
    request.on('error', () => {
      resolve(false);
    });
    
    request.setTimeout(5000, () => {
      request.abort();
      resolve(false);
    });
  });
}

/**
 * Checks if the login form is present on the page
 */
async function checkLoginForm(page) {
  try {
    const emailInput = await page.$('input[type="email"], input[name="email"]');
    const passwordInput = await page.$('input[type="password"], input[name="password"]');
    const loginButton = await page.$('button[type="submit"], button:contains("Login"), button:contains("Sign In")');
    
    return !!(emailInput && passwordInput && loginButton);
  } catch (error) {
    console.error('Error checking login form:', error.message);
    return false;
  }
}

/**
 * Tests the login functionality
 */
async function testLogin(page) {
  try {
    // Try standard test credentials
    const testCredentials = [
      { email: 'test@example.com', password: 'password' },
      { email: 'admin@example.com', password: 'admin' },
      { email: 'user@example.com', password: 'password' }
    ];
    
    for (const cred of testCredentials) {
      // Navigate to login page
      await page.goto(config.serverBaseUrl, { waitUntil: 'networkidle2' });
      
      // Fill in email and password
      await page.type('input[type="email"], input[name="email"]', cred.email);
      await page.type('input[type="password"], input[name="password"]', cred.password);
      
      // Take screenshot before submitting
      await page.screenshot({ path: path.join(config.screenshotDir, 'login-form-filled.png') });
      
      // Click login button
      await Promise.all([
        page.waitForNavigation({ timeout: config.testTimeout }).catch(() => {}),
        page.click('button[type="submit"], button:contains("Login"), button:contains("Sign In")')
      ]);
      
      // Take screenshot after login attempt
      await page.screenshot({ path: path.join(config.screenshotDir, 'after-login-attempt.png') });
      
      // Check if login was successful
      const dashboardElements = await page.$$('[data-testid="dashboard"], .dashboard, #dashboard');
      if (dashboardElements.length > 0) {
        console.log(`   Login successful with ${cred.email}`);
        return true;
      }
      
      console.log(`   Login failed with ${cred.email}`);
    }
    
    return false;
  } catch (error) {
    console.error('Error during login test:', error.message);
    return false;
  }
}

/**
 * Checks if the dashboard loads correctly
 */
async function checkDashboard(page) {
  try {
    // Navigate to dashboard
    await page.goto(`${config.serverBaseUrl}/dashboard`, { waitUntil: 'networkidle2' });
    
    // Take screenshot
    await page.screenshot({ path: path.join(config.screenshotDir, 'dashboard.png') });
    
    // Check for dashboard elements
    const dashboardElements = await page.$$('[data-testid="dashboard"], .dashboard, #dashboard');
    return dashboardElements.length > 0;
  } catch (error) {
    console.error('Error checking dashboard:', error.message);
    return false;
  }
}

/**
 * Tests modal functionality
 */
async function testModal(page) {
  try {
    // Navigate to dashboard
    await page.goto(`${config.serverBaseUrl}/dashboard`, { waitUntil: 'networkidle2' });
    
    // Look for a button that might open a modal
    const modalTriggers = [
      'button:contains("Create")',
      'button:contains("Add")',
      'button:contains("New")',
      '[data-testid*="create"]',
      '[data-testid*="add"]',
      '[data-testid*="new"]'
    ];
    
    for (const trigger of modalTriggers) {
      const buttons = await page.$$(trigger);
      if (buttons.length > 0) {
        // Click the first button
        await buttons[0].click();
        await page.waitForTimeout(1000);
        
        // Take screenshot
        await page.screenshot({ path: path.join(config.screenshotDir, 'modal-test.png') });
        
        // Check if a modal appeared
        const modals = await page.$$('.modal, [role="dialog"], [data-testid*="modal"]');
        if (modals.length > 0) {
          console.log(`   Modal opened with trigger: ${trigger}`);
          
          // Try to close the modal
          await page.keyboard.press('Escape');
          await page.waitForTimeout(500);
          
          return true;
        }
      }
    }
    
    console.log('   No modal triggers found or modal did not open');
    return false;
  } catch (error) {
    console.error('Error testing modal:', error.message);
    return false;
  }
}

/**
 * Tests form submission
 */
async function testFormSubmission(page) {
  try {
    // Navigate to dashboard
    await page.goto(`${config.serverBaseUrl}/dashboard`, { waitUntil: 'networkidle2' });
    
    // Look for a form
    const forms = await page.$$('form');
    if (forms.length === 0) {
      console.log('   No forms found to test submission');
      return false;
    }
    
    // Get the first form
    const form = forms[0];
    
    // Fill in text inputs with test data
    const inputs = await form.$$('input[type="text"], input:not([type])');
    for (const input of inputs) {
      await input.type('Test data');
    }
    
    // Take screenshot
    await page.screenshot({ path: path.join(config.screenshotDir, 'form-submission-test.png') });
    
    // Try to submit the form
    const submitButton = await form.$('button[type="submit"], input[type="submit"]');
    if (submitButton) {
      await submitButton.click();
      await page.waitForTimeout(2000);
      
      // Take screenshot after submission
      await page.screenshot({ path: path.join(config.screenshotDir, 'after-form-submission.png') });
      
      return true;
    }
    
    console.log('   No submit button found in form');
    return false;
  } catch (error) {
    console.error('Error testing form submission:', error.message);
    return false;
  }
}

/**
 * Checks for JavaScript errors on the page
 */
async function checkJavaScriptErrors(page) {
  try {
    const jsErrors = [];
    
    // Listen for console errors
    page.on('pageerror', error => {
      jsErrors.push(error.message);
    });
    
    // Navigate to dashboard
    await page.goto(`${config.serverBaseUrl}/dashboard`, { waitUntil: 'networkidle2' });
    
    // Wait a bit to capture any errors
    await page.waitForTimeout(2000);
    
    return jsErrors;
  } catch (error) {
    console.error('Error checking for JavaScript errors:', error.message);
    return ['Error checking for JavaScript errors: ' + error.message];
  }
}

/**
 * Checks for network issues
 */
async function checkNetworkIssues(page) {
  try {
    const networkIssues = [];
    
    // Listen for failed requests
    page.on('requestfailed', request => {
      networkIssues.push(`Failed request: ${request.url()} - ${request.failure().errorText}`);
    });
    
    // Navigate to dashboard
    await page.goto(`${config.serverBaseUrl}/dashboard`, { waitUntil: 'networkidle2' });
    
    // Wait a bit to capture any issues
    await page.waitForTimeout(2000);
    
    return networkIssues;
  } catch (error) {
    console.error('Error checking for network issues:', error.message);
    return ['Error checking for network issues: ' + error.message];
  }
}

// Run the validation if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  validateTestEnvironment()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Unhandled error during validation:', error);
      process.exit(1);
    });
}

export {
  validateTestEnvironment,
  checkServerRunning,
  checkLoginForm,
  testLogin,
  checkDashboard,
  testModal,
  testFormSubmission,
  checkJavaScriptErrors,
  checkNetworkIssues
};