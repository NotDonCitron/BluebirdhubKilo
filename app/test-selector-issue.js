const puppeteer = require('puppeteer');

async function testSelectors() {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  // Log all console messages from the page
  page.on('console', msg => {
    console.log(`[Browser Console] ${msg.text()}`);
  });
  
  // Log page errors
  page.on('pageerror', error => {
    console.error(`[Page Error] ${error.message}`);
  });
  
  try {
    // Navigate to the app
    await page.goto('http://localhost:3000/login');
    console.log('✅ Navigated to login page');
    
    // Test different selector formats
    const selectors = [
      '[data-testid="create-workspace"]',
      'button[aria-label*="workspace" i]',
      'button',
      // This should cause an error
      'button:has-text("New Workspace")'
    ];
    
    for (const selector of selectors) {
      try {
        // Try to use the selector
        const element = await page.$(selector);
        console.log(`✅ Selector "${selector}" is valid: ${element ? 'element found' : 'no element'}`);
      } catch (error) {
        console.error(`❌ Selector "${selector}" caused error: ${error.message}`);
      }
    }
    
    // Test the exact selector causing issues
    const problematicSelector = '[data-testid="create-workspace"], button:has-text("New Workspace"), button:contains("New Workspace")';
    console.log('\nTesting problematic selector...');
    
    try {
      const element = await page.$(problematicSelector);
      console.log(`Result: ${element ? 'element found' : 'no element'}`);
    } catch (error) {
      console.error(`Error with problematic selector: ${error.message}`);
    }
    
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await browser.close();
  }
}

testSelectors().catch(console.error);