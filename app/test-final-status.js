#!/usr/bin/env node

const puppeteer = require('puppeteer');

async function testFinalStatus() {
  console.log('🚀 FINAL GCLOUD APPFLOWY STATUS TEST');
  
  const browser = await puppeteer.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-cache', '--disable-application-cache']
  });
  
  try {
    const page = await browser.newPage();
    
    // Clear cache and disable cache
    await page.setCacheEnabled(false);
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false
      });
    });
    
    const networkFailures = [];
    const consoleErrors = [];
    
    page.on('response', (response) => {
      if (response.status() >= 400) {
        networkFailures.push({
          url: response.url(),
          status: response.status()
        });
      }
    });
    
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    console.log('🌐 Loading production with fresh cache...');
    await page.goto('https://clineapi-460920.uc.r.appspot.com/login?v=' + Date.now(), { 
      waitUntil: 'networkidle0',
      timeout: 60000
    });
    
    // Wait for potential hydration
    await new Promise(resolve => setTimeout(resolve, 8000));
    
    console.log('📸 Taking final screenshot...');
    await page.screenshot({ 
      path: 'final-gcloud-status.png',
      fullPage: true 
    });
    
    const finalCheck = await page.evaluate(() => {
      return {
        // Basic content check
        hasContent: document.body.innerText.length > 100,
        hasHeadings: document.querySelectorAll('h1,h2,h3').length > 0,
        hasButtons: document.querySelectorAll('button').length > 0,
        hasForm: !!document.querySelector('form'),
        
        // AppFlowy specific
        hasGradientBackground: !!document.querySelector('.bg-gradient-to-br'),
        hasAppFlowyHeading: !!document.querySelector('h1[style*="Poppins"]'),
        hasMainHeadline: document.querySelector('h1')?.textContent?.includes('Bring projects'),
        hasAIGradient: !!document.querySelector('span.bg-gradient-to-r'),
        hasStartButton: Array.from(document.querySelectorAll('button')).some(btn => btn.textContent?.includes('Start')),
        
        // Page state
        title: document.title,
        headingText: document.querySelector('h1')?.textContent,
        allHeadings: Array.from(document.querySelectorAll('h1,h2,h3')).map(h => h.textContent?.substring(0, 30)),
        bodyText: document.body.innerText.substring(0, 200),
        hasVisibleContent: !!document.querySelector('h1:not([style*="display: none"])')
      };
    });
    
    console.log('\n📊 FINAL STATUS REPORT:');
    console.log('=======================');
    console.log('✅ Content loaded:', finalCheck.hasContent);
    console.log('✅ Has headings:', finalCheck.hasHeadings); 
    console.log('✅ Has buttons:', finalCheck.hasButtons);
    console.log('✅ Has form:', finalCheck.hasForm);
    console.log('');
    console.log('🎨 APPFLOWY DESIGN:');
    console.log('✅ Gradient background:', finalCheck.hasGradientBackground);
    console.log('✅ AppFlowy heading font:', finalCheck.hasAppFlowyHeading);
    console.log('✅ Main headline text:', finalCheck.hasMainHeadline);
    console.log('✅ AI gradient text:', finalCheck.hasAIGradient);
    console.log('✅ Start button:', finalCheck.hasStartButton);
    console.log('');
    console.log('📝 CONTENT:');
    console.log('Title:', finalCheck.title);
    console.log('Main heading:', finalCheck.headingText);
    console.log('All headings:', finalCheck.allHeadings);
    console.log('Body text:', finalCheck.bodyText);
    console.log('');
    console.log('❌ Network failures:', networkFailures.length);
    console.log('❌ Console errors:', consoleErrors.length);
    
    if (networkFailures.length > 0) {
      console.log('\n🔍 Failed requests:');
      networkFailures.slice(0, 3).forEach(failure => {
        console.log(`  - ${failure.url} (${failure.status})`);
      });
    }
    
    // Final verdict
    const isWorking = finalCheck.hasContent && finalCheck.hasHeadings && networkFailures.length === 0;
    const hasAppFlowy = finalCheck.hasGradientBackground && finalCheck.hasAIGradient;
    
    console.log('\n🏆 FINAL VERDICT:');
    if (isWorking && hasAppFlowy) {
      console.log('🎉 SUCCESS: AppFlowy design is fully working on GCloud!');
    } else if (isWorking) {
      console.log('⚠️ PARTIAL: App is working but AppFlowy design may need time to propagate');
    } else {
      console.log('❌ ISSUE: Still experiencing technical difficulties');
    }
    
    return { isWorking, hasAppFlowy, finalCheck };
    
  } catch (error) {
    console.error('❌ Test error:', error);
    return { isWorking: false, hasAppFlowy: false, error: error.message };
  } finally {
    await browser.close();
  }
}

testFinalStatus().then(result => {
  console.log('\n📋 Test completed');
}).catch(console.error);