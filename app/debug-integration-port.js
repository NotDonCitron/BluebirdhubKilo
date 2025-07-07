const puppeteer = require('puppeteer');

(async () => {
  console.log('=== Integration Test Port Debug ===');
  console.log(`Environment BASE_URL: ${process.env.BASE_URL}`);
  console.log(`Process working directory: ${process.cwd()}`);
  
  const browser = await puppeteer.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  // Enable request interception to log all requests
  await page.setRequestInterception(true);
  page.on('request', (request) => {
    console.log(`Request URL: ${request.url()}`);
    request.continue();
  });
  
  try {
    // Try port 3000 (correct)
    console.log('\n--- Testing port 3000 ---');
    await page.goto('http://localhost:3000/login', { 
      waitUntil: 'networkidle0',
      timeout: 10000 
    });
    console.log('✅ Successfully connected to port 3000');
    const title3000 = await page.title();
    console.log(`Page title on 3000: ${title3000}`);
  } catch (error) {
    console.log(`❌ Failed to connect to port 3000: ${error.message}`);
  }
  
  try {
    // Try port 3001 (what tests are using)
    console.log('\n--- Testing port 3001 ---');
    await page.goto('http://localhost:3001/login', { 
      waitUntil: 'networkidle0',
      timeout: 10000 
    });
    console.log('✅ Successfully connected to port 3001');
    const title3001 = await page.title();
    console.log(`Page title on 3001: ${title3001}`);
  } catch (error) {
    console.log(`❌ Failed to connect to port 3001: ${error.message}`);
  }
  
  await browser.close();
  
  console.log('\n=== Debug Complete ===');
})();