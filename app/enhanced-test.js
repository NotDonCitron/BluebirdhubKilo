const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const BASE_URL = process.env.TEST_URL || 'http://localhost:3000';
const ROUTES = ['/', '/login', '/dashboard', '/dashboard/files', '/dashboard/tasks', '/dashboard/workspaces'];
const SCREENSHOT_DIR = path.join(__dirname, 'test-screenshots');

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function takeScreenshot(page, name) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, `${timestamp}-${name}.png`),
    fullPage: true
  });
}

async function testRoutes() {
  console.log('🧪 Enhanced AppFlowy Clone Functional Test Suite\n');
  let browser;
  const results = [];
  try {
    browser = await puppeteer.launch({
      headless: process.env.HEADLESS !== 'false',
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      slowMo: process.env.SLOW_MO ? parseInt(process.env.SLOW_MO) : 0
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });

    for (const route of ROUTES) {
      const url = BASE_URL + route;
      const logs = [];
      const errors = [];
      const failedRequests = [];
      page.removeAllListeners();
      page.on('console', (msg) => logs.push(`[${msg.type()}] ${msg.text()}`));
      page.on('pageerror', (error) => errors.push(`JavaScript Error: ${error.message}`));
      page.on('requestfailed', (request) => failedRequests.push(`Failed Request: ${request.url()} - ${request.failure().errorText}`));
      console.log(`\n🌐 Navigating to ${url}`);
      let status = 'unknown';
      let pageTitle = '';
      try {
        const response = await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
        status = response ? response.status() : 'no response';
        pageTitle = await page.title();
        await takeScreenshot(page, route.replace(/\//g, '_') || 'home');
      } catch (err) {
        errors.push(`Navigation error: ${err.message}`);
      }
      results.push({
        route,
        url,
        status,
        pageTitle,
        logs: logs.slice(0, 10),
        errors: errors.slice(0, 10),
        failedRequests: failedRequests.slice(0, 10),
        screenshot: `${route.replace(/\//g, '_') || 'home'}.png`
      });
      console.log(`   Status: ${status}`);
      if (errors.length > 0) console.log(`   ❌ Errors: ${errors[0]}`);
      if (failedRequests.length > 0) console.log(`   ❌ Failed Requests: ${failedRequests[0]}`);
    }
    await browser.close();
  } catch (error) {
    console.error('❌ Test suite failed:', error.message);
    if (browser) await browser.close();
  }
  // Output summary
  console.log('\n📋 Test Summary:');
  for (const r of results) {
    console.log(`\nRoute: ${r.route}`);
    console.log(`   Status: ${r.status}`);
    console.log(`   Title: ${r.pageTitle}`);
    if (r.errors.length > 0) console.log(`   ❌ Errors: ${r.errors.join(' | ')}`);
    if (r.failedRequests.length > 0) console.log(`   ❌ Failed Requests: ${r.failedRequests.join(' | ')}`);
    if (r.logs.length > 0) console.log(`   📝 Console Logs: ${r.logs.join(' | ')}`);
    console.log(`   📸 Screenshot: ${r.screenshot}`);
  }
  console.log(`\n📸 Screenshots saved to: ${SCREENSHOT_DIR}`);
}

testRoutes().catch(console.error); 