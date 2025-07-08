#!/usr/bin/env node

const puppeteer = require('puppeteer');

async function testLocalAppFlowy() {
  console.log('🏠 Testing LOCAL AppFlowy design...');
  
  const browser = await puppeteer.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    
    console.log('📱 Navigating to local development server...');
    await page.goto('http://localhost:3001/login', { 
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    console.log('📸 Taking screenshot...');
    await page.screenshot({ 
      path: 'local-appflowy-test.png',
      fullPage: true 
    });
    
    const appFlowyAnalysis = await page.evaluate(() => {
      return {
        // Core AppFlowy elements
        hasGradientBackground: !!document.querySelector('.bg-gradient-to-br'),
        hasAppFlowyHeading: !!document.querySelector('h1[style*="Poppins"]'),
        hasMainHeadline: document.querySelector('h1')?.textContent?.includes('Bring projects'),
        hasAIGradient: !!document.querySelector('span.bg-gradient-to-r'),
        hasStartButton: Array.from(document.querySelectorAll('button')).some(btn => btn.textContent?.includes('Start for free')),
        
        // Content verification
        title: document.title,
        headingText: document.querySelector('h1')?.textContent,
        allHeadings: Array.from(document.querySelectorAll('h1,h2,h3')).map(h => h.textContent?.substring(0, 50)),
        
        // Design elements
        gradientElements: document.querySelectorAll('[class*="gradient"]').length,
        purpleElements: document.querySelectorAll('[class*="purple"]').length,
        animatedElements: document.querySelectorAll('.animate-pulse').length,
        
        // Page structure
        hasForm: !!document.querySelector('form'),
        buttonCount: document.querySelectorAll('button').length,
        inputCount: document.querySelectorAll('input').length
      };
    });
    
    console.log('✅ LOCAL AppFlowy analysis:', JSON.stringify(appFlowyAnalysis, null, 2));
    
    // Score the design
    const coreFeatures = [
      appFlowyAnalysis.hasGradientBackground,
      appFlowyAnalysis.hasAppFlowyHeading, 
      appFlowyAnalysis.hasMainHeadline,
      appFlowyAnalysis.hasAIGradient,
      appFlowyAnalysis.hasStartButton
    ];
    
    const score = coreFeatures.filter(Boolean).length;
    const percentage = Math.round((score / coreFeatures.length) * 100);
    
    console.log(`\n🏆 LOCAL AppFlowy Score: ${score}/${coreFeatures.length} (${percentage}%)`);
    
    if (percentage >= 80) {
      console.log('🎉 SUCCESS: AppFlowy design is working locally!');
      return true;
    } else {
      console.log('❌ ISSUE: AppFlowy design is not working locally');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
    return false;
  } finally {
    await browser.close();
  }
}

testLocalAppFlowy().then(success => {
  if (success) {
    console.log('\n✅ Local AppFlowy design verified - ready to deploy!');
  } else {
    console.log('\n❌ Local AppFlowy design needs fixing before deployment');
  }
}).catch(console.error);