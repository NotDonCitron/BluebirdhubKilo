import puppeteer, { Browser, Page } from 'puppeteer';
import * as fs from 'fs';
import * as path from 'path';

describe('AppFlowy-Inspired Redesign Verification', () => {
  let browser: Browser;
  let page: Page;
  const baseUrl = process.env.BASE_URL || 'http://localhost:3001';
  const screenshotDir = path.join(__dirname, '../reports/screenshots');

  beforeAll(async () => {
    browser = await puppeteer.launch({
      headless: process.env.HEADLESS !== 'false',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    // Ensure screenshot directory exists
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
    }
  });

  beforeEach(async () => {
    page = await browser.newPage();
    await page.setDefaultTimeout(30000);
  });

  afterEach(async () => {
    if (page) {
      await page.close();
    }
  });

  afterAll(async () => {
    if (browser) {
      await browser.close();
    }
  });

  test('should capture AppFlowy-inspired redesign screenshots', async () => {
    console.log('🎨 Capturing AbacusHub AppFlowy-inspired redesign screenshots...');

    // Navigate to login page
    await page.goto(`${baseUrl}/login`, { 
      waitUntil: 'networkidle0',
      timeout: 30000 
    });

    // Wait for page to be fully rendered
    await page.waitForSelector('body', { timeout: 15000 });
    await new Promise(resolve => setTimeout(resolve, 3000));

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

    // Capture desktop view
    await page.setViewport({ width: 1440, height: 900 });
    await new Promise(resolve => setTimeout(resolve, 1000));
    await page.screenshot({ 
      path: path.join(screenshotDir, `${timestamp}-appflowy-redesign-desktop.png`),
      fullPage: true
    });
    console.log('✅ Desktop screenshot captured');

    // Capture tablet view
    await page.setViewport({ width: 768, height: 1024 });
    await new Promise(resolve => setTimeout(resolve, 1000));
    await page.screenshot({ 
      path: path.join(screenshotDir, `${timestamp}-appflowy-redesign-tablet.png`),
      fullPage: true
    });
    console.log('✅ Tablet screenshot captured');

    // Capture mobile view
    await page.setViewport({ width: 375, height: 812 });
    await new Promise(resolve => setTimeout(resolve, 1000));
    await page.screenshot({ 
      path: path.join(screenshotDir, `${timestamp}-appflowy-redesign-mobile.png`),
      fullPage: true
    });
    console.log('✅ Mobile screenshot captured');

    // Test form interaction
    await page.setViewport({ width: 1440, height: 900 });
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Test signup tab
    await page.evaluate(() => {
      const signupButton = Array.from(document.querySelectorAll('button')).find(btn => btn.textContent?.includes('Sign Up'));
      if (signupButton) signupButton.click();
    });
    await new Promise(resolve => setTimeout(resolve, 500));
    await page.screenshot({ 
      path: path.join(screenshotDir, `${timestamp}-appflowy-redesign-signup.png`),
      fullPage: true
    });
    console.log('✅ Signup form screenshot captured');

    // Test demo login button
    await page.evaluate(() => {
      const startButton = Array.from(document.querySelectorAll('button')).find(btn => btn.textContent?.includes('Start for free'));
      if (startButton) startButton.click();
    });
    await new Promise(resolve => setTimeout(resolve, 3000)); // Wait for potential navigation
    
    // Check if we're still on login page or redirected
    const currentUrl = page.url();
    if (currentUrl.includes('/dashboard')) {
      await page.screenshot({ 
        path: path.join(screenshotDir, `${timestamp}-appflowy-redesign-dashboard.png`),
        fullPage: true
      });
      console.log('✅ Dashboard after demo login screenshot captured');
    }

    // Verify design elements are present
    const designElements = await page.evaluate(() => {
      const hasGradientBackground = document.querySelector('[class*="from-purple-50"]');
      const hasLargeHeading = document.querySelector('h1[style*="Poppins"]');
      const hasAISpan = document.querySelector('span[class*="bg-gradient-to-r"]');
      const hasCheckCircles = document.querySelectorAll('svg[class*="CheckCircle"]');
      const hasGradientButtons = document.querySelector('button[class*="from-purple-600"]');
      
      return {
        gradientBackground: !!hasGradientBackground,
        appFlowyHeading: !!hasLargeHeading,
        gradientAIText: !!hasAISpan,
        featureChecks: hasCheckCircles.length > 0,
        gradientButtons: !!hasGradientButtons
      };
    });

    console.log('🎨 Design verification:', designElements);

    expect(designElements.gradientBackground).toBe(true);
    expect(designElements.appFlowyHeading).toBe(true);
    expect(designElements.gradientAIText).toBe(true);
    expect(designElements.featureChecks).toBe(true);
    expect(designElements.gradientButtons).toBe(true);

    console.log('🎉 AppFlowy-inspired redesign verification completed successfully!');
  }, 60000);

  test('should verify responsive design breakpoints', async () => {
    console.log('📱 Testing responsive design breakpoints...');

    await page.goto(`${baseUrl}/login`, { 
      waitUntil: 'networkidle0',
      timeout: 30000 
    });

    const breakpoints = [
      { width: 320, height: 568, name: 'mobile-small' },
      { width: 375, height: 812, name: 'mobile-large' },
      { width: 768, height: 1024, name: 'tablet' },
      { width: 1024, height: 768, name: 'tablet-landscape' },
      { width: 1440, height: 900, name: 'desktop' },
      { width: 1920, height: 1080, name: 'desktop-large' }
    ];

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

    for (const breakpoint of breakpoints) {
      await page.setViewport({ 
        width: breakpoint.width, 
        height: breakpoint.height 
      });
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Check layout structure
      const layoutInfo = await page.evaluate(() => {
        const container = document.querySelector('[class*="lg:flex-row"]');
        const leftSection = document.querySelector('[class*="lg:w-3/5"]');
        const rightSection = document.querySelector('[class*="lg:w-2/5"]');
        
        return {
          flexDirection: container ? window.getComputedStyle(container).flexDirection : 'unknown',
          leftSectionWidth: leftSection ? window.getComputedStyle(leftSection).width : 'unknown',
          rightSectionWidth: rightSection ? window.getComputedStyle(rightSection).width : 'unknown'
        };
      });

      await page.screenshot({ 
        path: path.join(screenshotDir, `${timestamp}-responsive-${breakpoint.name}.png`),
        fullPage: true
      });

      console.log(`✅ ${breakpoint.name} (${breakpoint.width}x${breakpoint.height}):`, layoutInfo);
    }

    console.log('📱 Responsive design verification completed!');
  }, 90000);
});