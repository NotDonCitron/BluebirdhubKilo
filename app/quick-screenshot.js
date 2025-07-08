const puppeteer = require('puppeteer');
const path = require('path');

async function captureScreenshot() {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    // Set viewport to desktop size
    await page.setViewport({ width: 1440, height: 900 });
    
    // Navigate to login page
    await page.goto('http://localhost:3000/login', { 
      waitUntil: 'networkidle0',
      timeout: 30000 
    });
    
    // Wait a moment for full rendering
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Capture screenshot
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const screenshotPath = path.join(__dirname, 'tests/reports/screenshots', `${timestamp}-live-appflowy-redesign.png`);
    
    await page.screenshot({ 
      path: screenshotPath,
      fullPage: true
    });
    
    console.log('✅ Screenshot captured:', screenshotPath);
    console.log('🌐 Server running at: http://localhost:3000/login');
    console.log('🎨 AppFlowy-inspired redesign is live and ready to view!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await browser.close();
  }
}

captureScreenshot();