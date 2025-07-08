#!/usr/bin/env node

const puppeteer = require('puppeteer');

async function finalAppFlowyVerification() {
  console.log('🔍 Final AppFlowy design verification on deployed GCloud app...');
  
  const browser = await puppeteer.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    
    // Add more time for the app to load and hydrate
    console.log('📱 Navigating to deployed app...');
    await page.goto('https://clineapi-460920.uc.r.appspot.com/login', { 
      waitUntil: 'networkidle0', // Wait for all network requests to finish
      timeout: 60000
    });
    
    // Wait for React to hydrate
    console.log('⏳ Waiting for React hydration...');
    await page.waitForSelector('h1', { timeout: 30000 });
    
    console.log('📸 Taking final screenshot...');
    await page.screenshot({ 
      path: 'final-appflowy-verification.png',
      fullPage: true 
    });
    
    console.log('🔍 Checking final AppFlowy design elements...');
    
    const designElements = await page.evaluate(() => {
      return {
        // Check for gradient background
        hasGradientBackground: !!document.querySelector('.bg-gradient-to-br'),
        // Check for Poppins font style
        hasAppFlowyHeading: !!document.querySelector('h1[style*="Poppins"]'),
        // Check for gradient AI text
        hasGradientAIText: !!document.querySelector('span.bg-gradient-to-r'),
        // Check for gradient buttons
        hasGradientButtons: !!document.querySelector('button.from-purple-600'),
        // Check page title
        pageTitle: document.title,
        // Check if form exists
        hasLoginForm: !!document.querySelector('form'),
        // Get the main heading text
        mainHeadingText: document.querySelector('h1')?.textContent?.substring(0, 100),
        // Check for AI gradient text specifically
        aiGradientText: document.querySelector('span.bg-gradient-to-r')?.textContent,
        // Check for demo button
        hasDemoButton: !!document.querySelector('[data-testid="demo-login-button"]'),
        // Get all h1 elements
        allHeadings: Array.from(document.querySelectorAll('h1')).map(h => h.textContent?.substring(0, 50)),
        // Check for specific AppFlowy elements
        hasFeatureChecks: !!document.querySelector('svg[data-lucide="check-circle"]'),
        hasAnimatedBackground: !!document.querySelector('.animate-pulse'),
        hasMotionElements: !!document.querySelector('.backdrop-blur-lg')
      };
    });
    
    console.log('✅ Final design elements analysis:', JSON.stringify(designElements, null, 2));
    
    if (designElements.hasGradientBackground && designElements.hasAppFlowyHeading && designElements.hasGradientAIText) {
      console.log('🎉 SUCCESS: AppFlowy design is correctly deployed!');
    } else {
      console.log('❌ ISSUE: AppFlowy design elements are missing');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await browser.close();
  }
}

finalAppFlowyVerification().catch(console.error);