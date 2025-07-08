/**
 * Simplified Visual Verification Test
 * 
 * This test captures screenshots to verify the website displays correctly
 * addressing the German user's feedback: "die website wird nicht richtig dargestelt"
 */

import { TestBrowser, config } from './setup';
import { takeScreenshot, createVisualReport } from '../utils/helpers';
import * as fs from 'fs';

describe('Visual Verification - Website Display', () => {
  let testBrowser: TestBrowser;
  let page: any;
  const screenshots: Array<{name: string, path: string, description: string, timestamp: string}> = [];
  
  // Production URL for visual verification
  const PRODUCTION_URL = 'https://clineapi-460920.uc.r.appspot.com';
  
  beforeAll(async () => {
    // Force production URL and non-headless mode for visual verification
    config.baseUrl = PRODUCTION_URL;
    config.headless = false; // Show browser for visual confirmation
    
    testBrowser = new TestBrowser();
    await testBrowser.launch();
    page = await testBrowser.newPage('visual-verification');
    
    console.log(`🎨 Starting visual verification of: ${PRODUCTION_URL}`);
  }, 120000);

  afterAll(async () => {
    // Generate visual report
    await createVisualReport(screenshots, 'visual-verification-report');
    
    await testBrowser.close();
    console.log(`📸 Visual verification complete. Screenshots saved to: ${config.screenshotPath}`);
  });

  it('should capture login page displaying correctly', async () => {
    console.log('📸 Capturing login page...');
    
    await page.goto(`${PRODUCTION_URL}/login`, { 
      waitUntil: ['networkidle0', 'domcontentloaded'],
      timeout: 60000 
    });
    
    // Wait for page to fully render using timeout
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Check if CSS is loaded
    const cssStatus = await page.evaluate(() => {
      const stylesheets = Array.from(document.styleSheets);
      const hasCSS = stylesheets.length > 0;
      const bodyStyles = window.getComputedStyle(document.body);
      const hasComputedStyles = bodyStyles.fontSize !== '';
      
      return {
        stylesheetCount: stylesheets.length,
        hasCSS,
        hasComputedStyles,
        bodyFontSize: bodyStyles.fontSize,
        bodyBackground: bodyStyles.backgroundColor
      };
    });
    
    console.log('CSS Status:', cssStatus);
    
    // Capture full page screenshot
    const screenshotPath = await takeScreenshot(page, 'login-page-full', {
      fullPage: true
    });
    
    screenshots.push({
      name: 'Login Page - Full View',
      path: screenshotPath,
      description: 'Complete login page showing styling, layout, and form elements',
      timestamp: new Date().toISOString()
    });
    
    // Verify page loaded correctly
    expect(cssStatus.hasCSS).toBe(true);
    expect(cssStatus.hasComputedStyles).toBe(true);
    
    console.log('✅ Login page screenshot captured successfully');
  }, 90000);

  it('should test responsive design', async () => {
    console.log('📱 Testing responsive design...');
    
    const viewports = [
      { name: 'mobile', width: 375, height: 667 },
      { name: 'desktop', width: 1920, height: 1080 }
    ];
    
    for (const viewport of viewports) {
      await page.setViewport({ width: viewport.width, height: viewport.height });
      await page.goto(`${PRODUCTION_URL}/login`, { waitUntil: 'networkidle0' });
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const screenshotPath = await takeScreenshot(page, `login-${viewport.name}`, {
        fullPage: true
      });
      
      screenshots.push({
        name: `Login Page - ${viewport.name.toUpperCase()}`,
        path: screenshotPath,
        description: `Login page at ${viewport.width}x${viewport.height} resolution`,
        timestamp: new Date().toISOString()
      });
      
      console.log(`✅ ${viewport.name} viewport captured`);
    }
  }, 120000);

  it('should authenticate and capture dashboard', async () => {
    console.log('🔐 Testing authentication flow...');
    
    // Reset to desktop viewport
    await page.setViewport({ width: 1920, height: 1080 });
    await page.goto(`${PRODUCTION_URL}/login`, { waitUntil: 'networkidle0' });
    
    // Wait for login form
    await page.waitForSelector('input[type="email"], input[name="email"]', { timeout: 30000 });
    await page.type('input[type="email"], input[name="email"]', config.credentials.email);
    await page.type('input[type="password"], input[name="password"]', config.credentials.password);
    
    // Capture login form filled
    const loginFilledPath = await takeScreenshot(page, 'login-form-filled');
    screenshots.push({
      name: 'Login Form - Filled',
      path: loginFilledPath,
      description: 'Login form with credentials entered, showing form styling',
      timestamp: new Date().toISOString()
    });
    
    // Submit login
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 30000 }),
      page.click('button[type="submit"], button:contains("Sign")') 
    ]);
    
    console.log('🎯 Authentication successful, capturing dashboard...');
    
    // Wait for dashboard to load
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Capture dashboard
    const dashboardPath = await takeScreenshot(page, 'dashboard-authenticated', {
      fullPage: true
    });
    
    screenshots.push({
      name: 'Dashboard - Authenticated View',
      path: dashboardPath,
      description: 'Main dashboard after successful login, showing navigation and content',
      timestamp: new Date().toISOString()
    });
    
    console.log('✅ Dashboard screenshot captured');
  }, 120000);

  it('should capture technical metrics', async () => {
    console.log('🔍 Analyzing technical display metrics...');
    
    const consoleLogs: string[] = [];
    const networkErrors: string[] = [];
    
    // Capture console messages
    page.on('console', (msg: any) => {
      consoleLogs.push(`${msg.type()}: ${msg.text()}`);
    });
    
    // Capture network failures  
    page.on('requestfailed', (request: any) => {
      networkErrors.push(`Failed: ${request.url()} - ${request.failure()?.errorText}`);
    });
    
    // Navigate and capture metrics
    await page.goto(`${PRODUCTION_URL}/login`, { waitUntil: 'networkidle0' });
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Get performance metrics
    const metrics = await page.metrics();
    
    // Check CSS and JavaScript loading
    const assetStatus = await page.evaluate(() => {
      const cssLinks = Array.from(document.querySelectorAll('link[rel="stylesheet"]'));
      const scripts = Array.from(document.querySelectorAll('script[src]'));
      const styles = Array.from(document.styleSheets);
      
      return {
        cssLinks: cssLinks.length,
        scriptTags: scripts.length,
        loadedStylesheets: styles.length,
        hasInlineStyles: document.querySelector('style') !== null,
        nextJSLoaded: typeof window.__NEXT_DATA__ !== 'undefined',
        bodyStyles: {
          fontSize: window.getComputedStyle(document.body).fontSize,
          color: window.getComputedStyle(document.body).color,
          backgroundColor: window.getComputedStyle(document.body).backgroundColor
        }
      };
    });
    
    // Save technical report
    const technicalReport = {
      timestamp: new Date().toISOString(),
      url: PRODUCTION_URL,
      consoleLogs: consoleLogs.slice(0, 20), // Limit logs
      networkErrors: networkErrors.slice(0, 10), // Limit errors
      performanceMetrics: metrics,
      assetStatus,
      userAgent: await page.evaluate(() => navigator.userAgent),
      viewport: await page.viewport()
    };
    
    const reportPath = config.screenshotPath + '/technical-report.json';
    fs.writeFileSync(reportPath, JSON.stringify(technicalReport, null, 2));
    
    console.log('📊 Technical analysis:', {
      consoleLogs: consoleLogs.length,
      networkErrors: networkErrors.length,
      cssLoaded: assetStatus.loadedStylesheets > 0,
      jsLoaded: assetStatus.scriptTags > 0,
      nextJSDetected: assetStatus.nextJSLoaded
    });
    
    // Verify assets loaded
    expect(assetStatus.loadedStylesheets).toBeGreaterThan(0);
    expect(assetStatus.bodyStyles.fontSize).toBeTruthy();
    
    console.log('✅ Technical verification complete');
  }, 60000);
});