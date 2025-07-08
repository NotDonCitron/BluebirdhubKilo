#!/usr/bin/env node

const puppeteer = require('puppeteer');

async function testUltimateFix() {
  console.log('🚀 ULTIMATE APPFLOWY FIX TEST');
  console.log('==============================');
  
  const browser = await puppeteer.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-cache', '--disable-application-cache', '--disable-extensions']
  });
  
  try {
    const page = await browser.newPage();
    
    // Force fresh load with no caching
    await page.setCacheEnabled(false);
    await page.setExtraHTTPHeaders({
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache'
    });
    
    const networkRequests = [];
    const networkFailures = [];
    const consoleMessages = [];
    
    page.on('request', (request) => {
      networkRequests.push(request.url());
    });
    
    page.on('response', (response) => {
      if (response.status() >= 400) {
        networkFailures.push({
          url: response.url(),
          status: response.status()
        });
      }
    });
    
    page.on('console', (msg) => {
      consoleMessages.push(`${msg.type()}: ${msg.text()}`);
    });
    
    console.log('🌐 Loading production with ultimate cache bypass...');
    const timestamp = Date.now();
    await page.goto(`https://clineapi-460920.uc.r.appspot.com/login?v=${timestamp}&t=${timestamp}&nocache=true`, { 
      waitUntil: 'networkidle2',
      timeout: 60000
    });
    
    // Wait for React hydration and any dynamic loading
    console.log('⏳ Waiting for full hydration...');
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    console.log('📸 Capturing final state...');
    await page.screenshot({ 
      path: 'ultimate-fix-test.png',
      fullPage: true 
    });
    
    const ultimateTest = await page.evaluate(() => {
      const result = {
        // Page state
        hasContent: document.body.children.length > 2,
        contentLength: document.body.innerText.length,
        hasHeadings: document.querySelectorAll('h1,h2,h3').length > 0,
        hasButtons: document.querySelectorAll('button').length > 0,
        hasForm: !!document.querySelector('form'),
        hasInputs: document.querySelectorAll('input').length > 0,
        
        // AppFlowy specific design elements
        hasGradientBackground: !!document.querySelector('.bg-gradient-to-br'),
        hasAppFlowyHeading: !!document.querySelector('h1[style*="Poppins"]'),
        hasMainHeadline: false,
        hasAIGradient: !!document.querySelector('span.bg-gradient-to-r'),
        hasStartButton: false,
        hasFeatureChecks: document.querySelectorAll('[data-lucide="check-circle"]').length > 0,
        hasAnimatedElements: document.querySelectorAll('.animate-pulse').length > 0,
        hasGradientText: document.querySelectorAll('.bg-gradient-to-r').length > 0,
        hasPurpleElements: document.querySelectorAll('[class*="purple"]').length > 0,
        hasBlueElements: document.querySelectorAll('[class*="blue"]').length > 0,
        
        // Content verification
        title: document.title,
        headings: Array.from(document.querySelectorAll('h1,h2,h3')).map(h => h.textContent?.substring(0, 40)),
        bodyText: document.body.innerText.substring(0, 300).replace(/\\s+/g, ' '),
        
        // Technical state
        hasVisibleContent: document.body.style.display !== 'none' && document.body.offsetHeight > 0,
        scriptsLoaded: document.querySelectorAll('script').length,
        stylesLoaded: document.querySelectorAll('style, link[rel="stylesheet"]').length
      };
      
      // Check for specific AppFlowy text
      const bodyText = document.body.innerText.toLowerCase();
      result.hasMainHeadline = bodyText.includes('bring projects') || bodyText.includes('teams together');
      result.hasStartButton = bodyText.includes('start for free') || bodyText.includes('start free');
      
      return result;
    });
    
    console.log('\\n📊 ULTIMATE TEST RESULTS:');
    console.log('=========================');
    console.log(`✅ Content loaded: ${ultimateTest.hasContent} (${ultimateTest.contentLength} chars)`);
    console.log(`✅ Has headings: ${ultimateTest.hasHeadings} (${ultimateTest.headings.length} found)`);
    console.log(`✅ Has buttons: ${ultimateTest.hasButtons}`);
    console.log(`✅ Has form: ${ultimateTest.hasForm}`);
    console.log(`✅ Has inputs: ${ultimateTest.hasInputs}`);
    console.log(`✅ Visible content: ${ultimateTest.hasVisibleContent}`);
    console.log(`✅ Scripts loaded: ${ultimateTest.scriptsLoaded}`);
    console.log(`✅ Styles loaded: ${ultimateTest.stylesLoaded}`);
    
    console.log('\\n🎨 APPFLOWY DESIGN STATUS:');
    console.log('==========================');
    console.log(`🎨 Gradient background: ${ultimateTest.hasGradientBackground}`);
    console.log(`🎨 AppFlowy heading font: ${ultimateTest.hasAppFlowyHeading}`);
    console.log(`🎨 Main headline: ${ultimateTest.hasMainHeadline}`);
    console.log(`🎨 AI gradient text: ${ultimateTest.hasAIGradient}`);
    console.log(`🎨 Start button: ${ultimateTest.hasStartButton}`);
    console.log(`🎨 Feature checks: ${ultimateTest.hasFeatureChecks}`);
    console.log(`🎨 Animated elements: ${ultimateTest.hasAnimatedElements}`);
    console.log(`🎨 Gradient text elements: ${ultimateTest.hasGradientText}`);
    console.log(`🎨 Purple elements: ${ultimateTest.hasPurpleElements}`);
    console.log(`🎨 Blue elements: ${ultimateTest.hasBlueElements}`);
    
    console.log('\\n📝 CONTENT DETAILS:');
    console.log('===================');
    console.log(`Title: ${ultimateTest.title}`);
    console.log(`Headings: ${ultimateTest.headings.join(', ')}`);
    console.log(`Body text: ${ultimateTest.bodyText}`);
    
    console.log('\\n🌐 NETWORK STATUS:');
    console.log('==================');
    console.log(`❌ Failed requests: ${networkFailures.length}`);
    console.log(`📡 Total requests: ${networkRequests.length}`);
    
    if (networkFailures.length > 0) {
      console.log('\\n🔍 FAILED REQUESTS:');
      networkFailures.slice(0, 5).forEach((failure, i) => {
        console.log(`  ${i+1}. ${failure.url} (${failure.status})`);
      });
    }
    
    if (consoleMessages.length > 0) {
      console.log('\\n📋 CONSOLE MESSAGES:');
      consoleMessages.slice(0, 5).forEach((msg, i) => {
        console.log(`  ${i+1}. ${msg}`);
      });
    }
    
    // Calculate success metrics
    const basicWorking = ultimateTest.hasContent && ultimateTest.hasHeadings && networkFailures.length === 0;
    const appFlowyScore = [
      ultimateTest.hasGradientBackground,
      ultimateTest.hasAppFlowyHeading,
      ultimateTest.hasMainHeadline,
      ultimateTest.hasAIGradient,
      ultimateTest.hasStartButton
    ].filter(Boolean).length;
    
    const appFlowyPercent = Math.round((appFlowyScore / 5) * 100);
    
    console.log('\\n🏆 FINAL VERDICT:');
    console.log('================');
    console.log(`📊 AppFlowy Design Score: ${appFlowyScore}/5 (${appFlowyPercent}%)`);
    
    if (basicWorking && appFlowyScore >= 4) {
      console.log('🎉 SUCCESS: AppFlowy design is fully working on GCloud!');
      console.log('🌟 The beautiful purple-blue gradients and typography are live!');
    } else if (basicWorking && appFlowyScore >= 2) {
      console.log('⚠️ PARTIAL SUCCESS: App is working, AppFlowy design partially loaded');
      console.log('📈 Some design elements are working, full deployment may be in progress');
    } else if (basicWorking) {
      console.log('✅ TECHNICAL SUCCESS: App is working without errors');
      console.log('🔄 AppFlowy design may still be propagating to all servers');
    } else {
      console.log('❌ ISSUE: Still experiencing technical difficulties');
      console.log('🔧 The deployment may need more time or additional fixes');
    }
    
    return { basicWorking, appFlowyScore, appFlowyPercent, ultimateTest };
    
  } catch (error) {
    console.error('❌ Test error:', error);
    return { basicWorking: false, appFlowyScore: 0, error: error.message };
  } finally {
    await browser.close();
  }
}

testUltimateFix().then(result => {
  console.log('\\n📋 Ultimate test completed!');
  console.log(`Status: ${result.basicWorking ? 'WORKING' : 'FAILED'}`);
  console.log(`AppFlowy: ${result.appFlowyPercent || 0}%`);
}).catch(console.error);