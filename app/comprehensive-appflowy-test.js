#!/usr/bin/env node

const puppeteer = require('puppeteer');

async function comprehensiveAppFlowyTest() {
  console.log('🔍 Comprehensive AppFlowy design verification...');
  
  const browser = await puppeteer.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    
    // Set a mobile user agent first to test responsiveness
    await page.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/604.1.38 (KHTML, like Gecko) Version/14.0 Mobile/15A372 Safari/604.1');
    await page.setViewport({ width: 375, height: 667 });
    
    console.log('📱 Testing mobile version...');
    await page.goto('https://clineapi-460920.uc.r.appspot.com/login', { 
      waitUntil: 'networkidle2',
      timeout: 60000
    });
    
    // Wait for content to load
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Take mobile screenshot
    await page.screenshot({ 
      path: 'appflowy-mobile-test.png',
      fullPage: true 
    });
    
    // Now test desktop version
    console.log('🖥️ Testing desktop version...');
    await page.setViewport({ width: 1920, height: 1080 });
    await page.reload({ waitUntil: 'networkidle2' });
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Take desktop screenshot
    await page.screenshot({ 
      path: 'appflowy-desktop-test.png',
      fullPage: true 
    });
    
    console.log('🔍 Analyzing AppFlowy design elements...');
    
    const comprehensiveAnalysis = await page.evaluate(() => {
      const results = {
        designElements: {},
        typography: {},
        colors: {},
        layout: {},
        interactive: {},
        content: {}
      };
      
      // Design Elements Analysis
      results.designElements.gradientBackground = !!document.querySelector('.bg-gradient-to-br');
      results.designElements.animatedBlobs = document.querySelectorAll('.animate-pulse').length;
      results.designElements.glassCard = !!document.querySelector('.backdrop-blur-lg');
      results.designElements.roundedElements = document.querySelectorAll('[class*="rounded-"]').length;
      
      // Typography Analysis
      const mainHeading = document.querySelector('h1');
      if (mainHeading) {
        const computedStyle = window.getComputedStyle(mainHeading);
        results.typography.fontFamily = computedStyle.fontFamily;
        results.typography.fontSize = computedStyle.fontSize;
        results.typography.fontWeight = computedStyle.fontWeight;
        results.typography.headingText = mainHeading.textContent?.substring(0, 100);
      }
      
      // Colors and Gradients
      results.colors.gradientElements = document.querySelectorAll('[class*="gradient"]').length;
      results.colors.purpleElements = document.querySelectorAll('[class*="purple"]').length;
      results.colors.blueElements = document.querySelectorAll('[class*="blue"]').length;
      
      // Layout Analysis
      results.layout.flexElements = document.querySelectorAll('[class*="flex"]').length;
      results.layout.gridElements = document.querySelectorAll('[class*="grid"]').length;
      results.layout.hasHeroSection = !!document.querySelector('h1');
      results.layout.hasSideBySide = window.innerWidth > 1024 ? 
        document.querySelectorAll('.lg\\:w-3\\/5, .lg\\:w-2\\/5').length >= 2 : true;
      
      // Interactive Elements
      results.interactive.buttons = document.querySelectorAll('button').length;
      results.interactive.forms = document.querySelectorAll('form').length;
      results.interactive.inputs = document.querySelectorAll('input').length;
      results.interactive.hasGradientButtons = !!document.querySelector('button[class*="from-purple-600"]');
      results.interactive.hasDemoButton = !!document.querySelector('[data-testid="demo-login-button"]');
      
      // Content Analysis
      results.content.hasAItext = !!document.querySelector('span.bg-gradient-to-r');
      results.content.hasFeatureChecks = document.querySelectorAll('[data-lucide="check-circle"]').length;
      results.content.hasBrandLogo = !!document.querySelector('.bg-gradient-to-br.from-purple-600');
      results.content.title = document.title;
      
      // Specific AppFlowy Elements
      results.appFlowySpecific = {
        hasMainHeadline: mainHeading?.textContent?.includes('Bring projects, files, and teams together'),
        hasAIGradient: !!document.querySelector('span.bg-gradient-to-r'),
        hasPoppinsFont: mainHeading?.style.fontFamily?.includes('Poppins'),
        hasAbacusHubBranding: !!document.querySelector('.text-2xl.font-bold'),
        hasStartButton: Array.from(document.querySelectorAll('button')).some(btn => btn.textContent?.includes('Start for free'))
      };
      
      return results;
    });
    
    console.log('✅ Comprehensive analysis complete:', JSON.stringify(comprehensiveAnalysis, null, 2));
    
    // Test specific AppFlowy features
    console.log('🎯 Testing specific AppFlowy features...');
    
    const featureTest = await page.evaluate(() => {
      // Check for specific AppFlowy design patterns
      return {
        largeTypography: !!document.querySelector('.text-5xl, .lg\\:text-7xl'),
        gradientAI: !!document.querySelector('span.bg-gradient-to-r'),
        featureGrid: !!document.querySelector('.grid.grid-cols-1.md\\:grid-cols-2'),
        heroLayout: !!document.querySelector('.lg\\:w-3\\/5'),
        authCard: !!document.querySelector('.bg-white\\/80.backdrop-blur-lg'),
        tabSwitching: !!document.querySelector('.grid.grid-cols-2.gap-2'),
        modernInputs: !!document.querySelector('.rounded-xl'),
        brandColors: !!document.querySelector('.from-purple-600.to-blue-600')
      };
    });
    
    console.log('🎯 Feature test results:', featureTest);
    
    // Overall score
    const score = Object.values(featureTest).filter(Boolean).length;
    const totalFeatures = Object.keys(featureTest).length;
    const percentage = Math.round((score / totalFeatures) * 100);
    
    console.log(`\n🏆 AppFlowy Design Score: ${score}/${totalFeatures} (${percentage}%)`);
    
    if (percentage >= 80) {
      console.log('🎉 SUCCESS: AppFlowy design is correctly deployed!');
    } else {
      console.log('❌ ISSUE: AppFlowy design compliance is below threshold');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await browser.close();
  }
}

comprehensiveAppFlowyTest().catch(console.error);