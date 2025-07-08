const puppeteer = require('puppeteer');

async function debugIntegrationTest() {
  console.log('Starting debug integration test...');
  console.log('BASE_URL from environment:', process.env.BASE_URL);
  console.log('Config baseUrl should be:', process.env.BASE_URL || 'http://localhost:3000');
  
  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  // Enable request interception to log all requests
  await page.setRequestInterception(true);
  page.on('request', (request) => {
    console.log(`[REQUEST] ${request.method()} ${request.url()}`);
    request.continue();
  });
  
  page.on('response', (response) => {
    console.log(`[RESPONSE] ${response.status()} ${response.url()}`);
  });
  
  page.on('console', (msg) => {
    console.log(`[CONSOLE] ${msg.text()}`);
  });
  
  try {
    // Try to navigate to login page
    const loginUrl = `${process.env.BASE_URL || 'http://localhost:3000'}/login`;
    console.log(`Attempting to navigate to: ${loginUrl}`);
    
    await page.goto(loginUrl, { 
      waitUntil: 'networkidle0',
      timeout: 30000 
    });
    
    console.log('Successfully navigated to login page');
    console.log('Current URL:', page.url());
    
    // Take a screenshot
    await page.screenshot({ path: 'debug-login-page.png' });
    console.log('Screenshot saved as debug-login-page.png');
    
    // Check for form elements
    const emailInput = await page.$('[data-testid="email-input"], input[type="email"], input[name="email"], #email');
    const passwordInput = await page.$('[data-testid="password-input"], input[type="password"], input[name="password"], #password');
    const loginButton = await page.$('[data-testid="login-button"], button[type="submit"], button:has-text("Sign in"), button:has-text("Log in")');
    
    console.log('Form elements found:');
    console.log('- Email input:', !!emailInput);
    console.log('- Password input:', !!passwordInput);
    console.log('- Login button:', !!loginButton);
    
  } catch (error) {
    console.error('Error during test:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    await browser.close();
    console.log('Browser closed');
  }
}

// Set BASE_URL if not already set
process.env.BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

debugIntegrationTest().catch(console.error);