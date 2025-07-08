#!/usr/bin/env node

const puppeteer = require('puppeteer');

async function debugDeployedAppFlowy() {
  console.log('🔍 Debugging AppFlowy design on deployed GCloud app...');
  
  const browser = await puppeteer.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    
    console.log('📱 Navigating to deployed app...');
    await page.goto('https://clineapi-460920.uc.r.appspot.com/login', { 
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    console.log('📸 Taking screenshot...');
    await page.screenshot({ 
      path: 'deployed-appflowy-verification.png',
      fullPage: true 
    });
    
    console.log('🔍 Checking AppFlowy design elements...');
    
    const designElements = await page.evaluate(() => {
      return {
        hasGradientBackground: !!document.querySelector('[class*="from-purple-50"]'),
        hasAppFlowyHeading: !!document.querySelector('h1[style*="Poppins"]'),
        hasGradientAIText: !!document.querySelector('span[class*="bg-gradient-to-r"]'),
        hasGradientButtons: !!document.querySelector('button[class*="from-purple-600"]'),
        pageTitle: document.title,
        hasLoginForm: !!document.querySelector('form'),
        bodyClasses: document.body.className,
        htmlContent: document.documentElement.innerHTML.substring(0, 1000)
      };
    });
    
    console.log('✅ Design elements analysis:', designElements);
    
    console.log('🎨 Page HTML preview:');
    console.log(designElements.htmlContent);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await browser.close();
  }
}

debugDeployedAppFlowy().catch(console.error);