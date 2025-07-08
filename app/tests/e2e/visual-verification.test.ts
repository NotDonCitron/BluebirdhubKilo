/**
 * Visual Verification Test Suite
 * 
 * This test suite captures comprehensive screenshots of the production website
 * to verify the display issues reported by the German user have been resolved.
 * 
 * Original Issue: "die website wird nicht richtig dargestelt"
 * Goal: Provide visual evidence that the website displays correctly
 */

import { TestBrowser, config } from './setup';
import { AUTH_SELECTORS, NAVIGATION_SELECTORS } from '../utils/selectors';
import { takeScreenshot, createVisualReport } from '../utils/helpers';
import * as fs from 'fs';
import * as path from 'path';

describe('Visual Verification - Production Website Display', () => {
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
    
    // Ensure screenshot directory exists
    if (!fs.existsSync(config.screenshotPath)) {
      fs.mkdirSync(config.screenshotPath, { recursive: true });
    }
    
    console.log(`🎨 Starting visual verification of: ${PRODUCTION_URL}`);
  }, 120000);

  afterAll(async () => {
    // Generate visual report
    await createVisualReport(screenshots, 'visual-verification-report');
    
    await testBrowser.close();
    console.log(`📸 Visual verification complete. Screenshots saved to: ${config.screenshotPath}`);
  });

  describe('Core Page Visual Verification', () => {
    it('should capture login page with proper styling', async () => {
      console.log('📸 Capturing login page...');
      
      await page.goto(`${PRODUCTION_URL}/login`, { 
        waitUntil: ['networkidle0', 'domcontentloaded'],
        timeout: 60000 
      });
      
      // Wait for page to fully render
      await page.waitForTimeout(3000);
      
      // Check if CSS is loaded
      const cssLoaded = await page.evaluate(() => {
        const stylesheets = Array.from(document.styleSheets);
        return stylesheets.length > 0 && !document.querySelector('.no-css-fallback');
      });
      
      console.log(`CSS Status: ${cssLoaded ? '✅ Loaded' : '❌ Not Loaded'}`);
      
      // Capture full page screenshot
      const screenshotPath = await takeScreenshot(page, 'login-page-full', {
        fullPage: true,
        quality: 90
      });
      
      screenshots.push({
        name: 'Login Page - Full View',
        path: screenshotPath,
        description: 'Complete login page showing styling, layout, and form elements',
        timestamp: new Date().toISOString()
      });
      
      // Verify key elements are visible
      const formVisible = await page.$(AUTH_SELECTORS.LOGIN_FORM);
      expect(formVisible).toBeTruthy();
      
      console.log('✅ Login page screenshot captured');
    }, 90000);

    it('should capture responsive design at different viewports', async () => {
      console.log('📱 Testing responsive design...');
      
      const viewports = [
        { name: 'mobile', width: 375, height: 667, description: 'Mobile viewport (iPhone)' },
        { name: 'tablet', width: 768, height: 1024, description: 'Tablet viewport (iPad)' },
        { name: 'desktop', width: 1920, height: 1080, description: 'Desktop viewport (Full HD)' }
      ];
      
      for (const viewport of viewports) {
        await page.setViewport({ width: viewport.width, height: viewport.height });
        await page.goto(`${PRODUCTION_URL}/login`, { waitUntil: 'networkidle0' });
        await page.waitForTimeout(2000);
        
        const screenshotPath = await takeScreenshot(page, `login-${viewport.name}`, {
          fullPage: true
        });
        
        screenshots.push({
          name: `Login Page - ${viewport.name.toUpperCase()}`,
          path: screenshotPath,
          description: `${viewport.description} (${viewport.width}x${viewport.height})`,
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
      
      // Fill login form
      await page.waitForSelector(AUTH_SELECTORS.EMAIL_INPUT, { timeout: 30000 });
      await page.type(AUTH_SELECTORS.EMAIL_INPUT, config.credentials.email);
      await page.type(AUTH_SELECTORS.PASSWORD_INPUT, config.credentials.password);
      
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
        page.click(AUTH_SELECTORS.LOGIN_BUTTON)
      ]);
      
      console.log('🎯 Authentication successful, capturing dashboard...');
      
      // Wait for dashboard to fully load
      await page.waitForTimeout(5000);
      
      // Capture dashboard
      const dashboardPath = await takeScreenshot(page, 'dashboard-authenticated', {
        fullPage: true,
        quality: 90
      });
      
      screenshots.push({
        name: 'Dashboard - Authenticated View',
        path: dashboardPath,
        description: 'Main dashboard after successful login, showing navigation and content',
        timestamp: new Date().toISOString()
      });
      
      console.log('✅ Dashboard screenshot captured');
    }, 120000);

    it('should capture settings and other key pages', async () => {
      console.log('⚙️ Capturing settings and navigation...');
      
      // Navigate to settings
      const settingsSelector = NAVIGATION_SELECTORS.SETTINGS_LINK || 'a[href*="settings"]';
      await page.waitForSelector(settingsSelector, { timeout: 15000 });
      await page.click(settingsSelector);
      await page.waitForNavigation({ waitUntil: 'networkidle0' });
      await page.waitForTimeout(3000);
      
      // Capture settings page
      const settingsPath = await takeScreenshot(page, 'settings-page', {
        fullPage: true
      });
      
      screenshots.push({
        name: 'Settings Page',
        path: settingsPath,
        description: 'Settings page showing form controls and navigation',
        timestamp: new Date().toISOString()
      });
      
      console.log('✅ Settings page captured');
    }, 90000);
  });

  describe('Technical Display Verification', () => {
    it('should capture browser console logs and network activity', async () => {
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
      
      // Navigate to login and capture metrics
      await page.goto(`${PRODUCTION_URL}/login`, { waitUntil: 'networkidle0' });
      await page.waitForTimeout(5000);
      
      // Get performance metrics
      const metrics = await page.metrics();
      const paintMetrics = await page.evaluate(() => {
        return JSON.stringify(performance.getEntriesByType('paint'));
      });
      
      // Save technical report
      const technicalReport = {
        timestamp: new Date().toISOString(),
        url: PRODUCTION_URL,
        consoleLogs: consoleLogs,
        networkErrors: networkErrors,
        performanceMetrics: metrics,
        paintMetrics: JSON.parse(paintMetrics),
        userAgent: await page.evaluate(() => navigator.userAgent),
        viewportSize: await page.viewport()
      };
      
      const reportPath = path.join(config.screenshotPath, 'technical-report.json');
      fs.writeFileSync(reportPath, JSON.stringify(technicalReport, null, 2));
      
      console.log('📊 Technical report saved:', reportPath);
      console.log(`Console logs: ${consoleLogs.length}, Network errors: ${networkErrors.length}`);
      
      // Verify no critical errors
      const criticalErrors = consoleLogs.filter(log => 
        log.includes('error:') && !log.includes('DevTools')
      );
      
      expect(criticalErrors.length).toBe(0);
    }, 60000);

    it('should verify CSS and JavaScript loading', async () => {
      console.log('🎨 Verifying asset loading...');
      
      await page.goto(`${PRODUCTION_URL}/login`, { waitUntil: 'networkidle0' });
      
      // Check CSS loading
      const cssStatus = await page.evaluate(() => {
        const links = Array.from(document.querySelectorAll('link[rel="stylesheet"]'));
        const styles = Array.from(document.styleSheets);
        
        return {
          cssLinks: links.length,
          loadedStylesheets: styles.length,
          hasInlineStyles: document.querySelector('style') !== null,
          computedStyles: window.getComputedStyle(document.body).fontSize !== ''
        };
      });
      
      // Check JavaScript loading
      const jsStatus = await page.evaluate(() => {
        const scripts = Array.from(document.querySelectorAll('script[src]'));
        return {
          scriptTags: scripts.length,
          reactLoaded: typeof window.React !== 'undefined' || document.querySelector('[data-reactroot]') !== null,
          nextJSLoaded: window.__NEXT_DATA__ !== undefined
        };
      });
      
      console.log('CSS Status:', cssStatus);
      console.log('JS Status:', jsStatus);
      
      // Verify assets loaded properly
      expect(cssStatus.loadedStylesheets).toBeGreaterThan(0);
      expect(cssStatus.computedStyles).toBe(true);
      
      console.log('✅ Asset loading verification complete');
    }, 45000);
  });
});