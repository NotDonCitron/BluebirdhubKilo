const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  try {
    await page.goto('http://localhost:3001', { waitUntil: 'networkidle2', timeout: 30000 });
    console.log('Page loaded!');
  } catch (e) {
    console.error('Failed to load:', e.message);
  }
  await browser.close();
})(); 