const puppeteer = require('puppeteer');

async function testWorkspaceElements() {
  const browser = await puppeteer.launch({ 
    headless: false,
    defaultViewport: { width: 1366, height: 768 }
  });
  
  const page = await browser.newPage();
  
  try {
    console.log('🔍 Testing Workspace Element Detection...');
    
    // Navigate to login
    await page.goto('http://localhost:3000/login');
    
    // Login
    await page.type('input[type="email"]', 'john@doe.com');
    await page.type('input[type="password"]', 'johndoe123');
    await page.click('button[type="submit"]');
    
    // Wait for dashboard
    await page.waitForNavigation();
    await new Promise(r => setTimeout(r, 2000));
    
    // Navigate to workspaces
    await page.goto('http://localhost:3000/dashboard/workspaces');
    await new Promise(r => setTimeout(r, 3000));
    
    console.log('📍 Current URL:', page.url());
    
    // Test all selectors
    const selectors = [
      { name: 'Create Workspace Button (data-testid)', selector: '[data-testid="create-workspace-button"]' },
      { name: 'Create Workspace Button (Plus icon)', selector: 'button svg.lucide-plus' },
      { name: 'Create Workspace Button (Parent)', selector: 'button:has(svg.lucide-plus)' },
      { name: 'Dialog Trigger', selector: '[data-state="closed"]' },
      { name: 'Button with Plus', selector: 'button:has(.lucide-plus)' },
      { name: 'Any Button', selector: 'button' }
    ];
    
    for (const { name, selector } of selectors) {
      try {
        await page.waitForSelector(selector, { timeout: 2000 });
        console.log(`✅ Found: ${name} (${selector})`);
      } catch (e) {
        console.log(`❌ Not found: ${name} (${selector})`);
      }
    }
    
    // Try to click the create button
    console.log('\n🖱️  Attempting to click create workspace button...');
    
    let clicked = false;
    const buttonSelectors = [
      '[data-testid="create-workspace-button"]',
      'button svg.lucide-plus',
      'button:has(svg)'
    ];
    
    for (const selector of buttonSelectors) {
      try {
        const element = await page.$(selector);
        if (element) {
          console.log(`📌 Clicking: ${selector}`);
          await element.click();
          clicked = true;
          break;
        }
      } catch (e) {
        console.log(`⚠️  Failed to click: ${selector}`);
      }
    }
    
    if (clicked) {
      await new Promise(r => setTimeout(r, 2000));
      
      // Check if modal opened
      const modalOpen = await page.$('[role="dialog"]') !== null;
      console.log(`🗔  Modal opened: ${modalOpen}`);
      
      if (modalOpen) {
        // Test form elements
        const formSelectors = [
          { name: 'Name Input (data-testid)', selector: '[data-testid="workspace-name-input"]' },
          { name: 'Name Input (ID)', selector: 'input#name' },
          { name: 'Description (data-testid)', selector: '[data-testid="workspace-description-input"]' },
          { name: 'Description (ID)', selector: 'textarea#description' },
          { name: 'Submit Button (data-testid)', selector: '[data-testid="workspace-submit-button"]' },
          { name: 'Submit Button (type)', selector: 'button[type="submit"]' }
        ];
        
        console.log('\n📝 Testing form elements...');
        for (const { name, selector } of formSelectors) {
          try {
            await page.waitForSelector(selector, { timeout: 1000 });
            console.log(`✅ Found: ${name}`);
          } catch (e) {
            console.log(`❌ Not found: ${name}`);
          }
        }
        
        // Try filling and submitting
        console.log('\n📋 Testing form submission...');
        try {
          await page.type('[data-testid="workspace-name-input"], input#name', 'Test Workspace');
          await page.type('[data-testid="workspace-description-input"], textarea#description', 'Test Description');
          
          console.log('✅ Form filled successfully');
          
          await page.click('[data-testid="workspace-submit-button"], button[type="submit"]');
          console.log('✅ Submit button clicked');
          
          await new Promise(r => setTimeout(r, 5000));
          
          // Check if modal closed
          const modalStillOpen = await page.$('[role="dialog"]') !== null;
          console.log(`🗔  Modal still open: ${modalStillOpen}`);
          
          if (!modalStillOpen) {
            console.log('🎉 Workspace creation appears successful!');
          }
          
        } catch (e) {
          console.log('❌ Form submission failed:', e.message);
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    console.log('\n🔚 Test completed. Browser will close in 5 seconds...');
    await new Promise(r => setTimeout(r, 5000));
    await browser.close();
  }
}

testWorkspaceElements().catch(console.error); 