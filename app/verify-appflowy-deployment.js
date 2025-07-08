#!/usr/bin/env node

const puppeteer = require('puppeteer');

async function verifyAppFlowyDeployment() {
  console.log('🔄 Verifying AppFlowy deployment vs local...');
  
  const browser = await puppeteer.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    
    // Test local version first
    console.log('🏠 Testing LOCAL version...');
    try {
      await page.goto('http://localhost:3000/login', { 
        waitUntil: 'networkidle2',
        timeout: 10000
      });
      
      const localContent = await page.evaluate(() => {
        return {
          hasGradientBg: !!document.querySelector('.bg-gradient-to-br'),
          hasAppFlowyHeading: !!document.querySelector('h1[style*="Poppins"]'),
          hasMainHeadline: document.querySelector('h1')?.textContent?.includes('Bring projects'),
          title: document.title,
          bodyContent: document.body.innerHTML.substring(0, 500)
        };
      });
      
      console.log('🏠 LOCAL results:', localContent);
      
    } catch (error) {
      console.log('🏠 LOCAL: Server not running or error:', error.message);
    }
    
    // Test deployed version
    console.log('\n🌐 Testing DEPLOYED version...');
    await page.goto('https://clineapi-460920.uc.r.appspot.com/login', { 
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    await new Promise(resolve => setTimeout(resolve, 5000)); // Wait for hydration
    
    const deployedContent = await page.evaluate(() => {
      return {
        hasGradientBg: !!document.querySelector('.bg-gradient-to-br'),
        hasAppFlowyHeading: !!document.querySelector('h1[style*="Poppins"]'),
        hasMainHeadline: document.querySelector('h1')?.textContent?.includes('Bring projects'),
        title: document.title,
        headingText: document.querySelector('h1')?.textContent,
        allHeadings: Array.from(document.querySelectorAll('h1,h2,h3')).map(h => h.textContent),
        bodyContent: document.body.innerHTML.substring(0, 500)
      };
    });
    
    console.log('🌐 DEPLOYED results:', deployedContent);
    
    // Take screenshot of deployed version
    await page.screenshot({ 
      path: 'deployed-verification.png',
      fullPage: true 
    });
    
    // Compare and conclude
    console.log('\n📊 COMPARISON:');
    console.log('- Gradient Background: LOCAL vs DEPLOYED =', 'Unknown', 'vs', deployedContent.hasGradientBg);
    console.log('- AppFlowy Heading: LOCAL vs DEPLOYED =', 'Unknown', 'vs', deployedContent.hasAppFlowyHeading);
    console.log('- Main Headline: LOCAL vs DEPLOYED =', 'Unknown', 'vs', deployedContent.hasMainHeadline);
    
    if (deployedContent.hasGradientBg && deployedContent.hasAppFlowyHeading && deployedContent.hasMainHeadline) {
      console.log('\n✅ SUCCESS: AppFlowy design is correctly deployed!');
    } else {
      console.log('\n❌ ISSUE: AppFlowy design elements are missing from deployment');
      console.log('Heading found:', deployedContent.headingText);
      console.log('All headings:', deployedContent.allHeadings);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await browser.close();
  }
}

verifyAppFlowyDeployment().catch(console.error);