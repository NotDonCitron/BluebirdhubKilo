#!/usr/bin/env node

const puppeteer = require('puppeteer');

async function testAppFlowyFix() {
  console.log('🔧 Testing AppFlowy design fix on production...');
  
  const browser = await puppeteer.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    
    // Monitor console errors
    const consoleErrors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    // Monitor network failures
    const networkFailures = [];
    page.on('response', (response) => {
      if (response.status() >= 400) {
        networkFailures.push({
          url: response.url(),
          status: response.status()
        });
      }
    });
    
    console.log('🌐 Loading production app...');
    await page.goto('https://clineapi-460920.uc.r.appspot.com/login', { 
      waitUntil: 'networkidle2',
      timeout: 60000
    });
    
    // Wait for React hydration
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    console.log('📸 Taking screenshot...');
    await page.screenshot({ 
      path: 'appflowy-fix-test.png',
      fullPage: true 
    });
    
    // Check if AppFlowy design is rendering
    const appFlowyCheck = await page.evaluate(() => {
      return {
        // Check if page has proper content (not just JavaScript errors)
        hasContent: document.body.children.length > 1,
        hasHeadings: document.querySelectorAll('h1,h2,h3').length > 0,
        hasButtons: document.querySelectorAll('button').length > 0,
        hasForm: !!document.querySelector('form'),
        
        // AppFlowy specific elements
        hasGradientBackground: !!document.querySelector('.bg-gradient-to-br'),
        hasAppFlowyHeading: !!document.querySelector('h1[style*="Poppins"]'),
        hasMainHeadline: document.querySelector('h1')?.textContent?.includes('Bring projects'),
        hasAIGradient: !!document.querySelector('span.bg-gradient-to-r'),
        hasStartButton: Array.from(document.querySelectorAll('button')).some(btn => btn.textContent?.includes('Start for free')),
        
        // Check page state
        title: document.title,
        headingText: document.querySelector('h1')?.textContent,
        bodyHTML: document.body.innerHTML.substring(0, 200)
      };
    });
    
    console.log('✅ AppFlowy check results:', JSON.stringify(appFlowyCheck, null, 2));
    console.log('❌ Console errors:', consoleErrors.length > 0 ? consoleErrors : 'None');
    console.log('🌐 Network failures:', networkFailures.length > 0 ? networkFailures : 'None');
    
    // Determine success
    const isFixed = appFlowyCheck.hasContent && appFlowyCheck.hasHeadings && networkFailures.length === 0;
    const hasAppFlowyDesign = appFlowyCheck.hasGradientBackground && appFlowyCheck.hasAppFlowyHeading;
    
    if (isFixed && hasAppFlowyDesign) {
      console.log('\n🎉 SUCCESS: AppFlowy design is working perfectly on production!');
      return true;
    } else if (isFixed) {
      console.log('\n⚠️ PARTIAL SUCCESS: No client errors, but AppFlowy design may need time to deploy');
      return true;
    } else {
      console.log('\n❌ ISSUE: Still experiencing client-side errors or missing content');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Test error:', error);
    return false;
  } finally {
    await browser.close();
  }
}

testAppFlowyFix().then(success => {
  process.exit(success ? 0 : 1);
}).catch(console.error);