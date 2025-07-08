import puppeteer, { Browser, Page } from 'puppeteer';
import * as fs from 'fs';
import * as path from 'path';

describe('Simple AppFlowy Redesign Capture', () => {
  let browser: Browser;
  let page: Page;
  const baseUrl = 'http://localhost:3001';
  const screenshotDir = path.join(__dirname, '../reports/screenshots');

  beforeAll(async () => {
    browser = await puppeteer.launch({
      headless: false, // Run with browser visible
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
    }
  });

  afterAll(async () => {
    if (browser) {
      await browser.close();
    }
  });

  test('should capture redesigned login page screenshots', async () => {
    console.log('📸 Capturing AppFlowy-inspired redesign screenshots...');
    
    page = await browser.newPage();
    
    try {
      // Set desktop viewport
      await page.setViewport({ width: 1440, height: 900 });
      
      // Navigate to login page with simpler wait condition
      await page.goto(`${baseUrl}/login`, { 
        waitUntil: 'domcontentloaded',
        timeout: 15000 
      });

      // Wait for content to load
      await new Promise(resolve => setTimeout(resolve, 3000));

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

      // Capture desktop screenshot
      await page.screenshot({ 
        path: path.join(screenshotDir, `${timestamp}-appflowy-redesign-desktop.png`),
        fullPage: true
      });
      console.log('✅ Desktop screenshot captured');

      // Capture mobile view
      await page.setViewport({ width: 375, height: 812 });
      await new Promise(resolve => setTimeout(resolve, 1000));
      await page.screenshot({ 
        path: path.join(screenshotDir, `${timestamp}-appflowy-redesign-mobile.png`),
        fullPage: true
      });
      console.log('✅ Mobile screenshot captured');

      // Check if AppFlowy design elements are present
      const hasDesignElements = await page.evaluate(() => {
        const gradientBg = document.querySelector('[class*="from-purple-50"]');
        const largeHeading = document.querySelector('h1[style*="Poppins"]');
        const gradientText = document.querySelector('span[class*="bg-gradient-to-r"]');
        const gradientButton = document.querySelector('button[class*="from-purple-600"]');
        
        return {
          gradientBackground: !!gradientBg,
          appFlowyHeading: !!largeHeading,
          gradientAIText: !!gradientText,
          gradientButton: !!gradientButton
        };
      });

      console.log('🎨 Design verification results:', hasDesignElements);

      expect(hasDesignElements.gradientBackground).toBe(true);
      expect(hasDesignElements.appFlowyHeading).toBe(true);
      expect(hasDesignElements.gradientAIText).toBe(true);
      expect(hasDesignElements.gradientButton).toBe(true);

      console.log('🎉 AppFlowy-inspired redesign screenshots captured successfully!');

    } catch (error) {
      console.error('❌ Screenshot capture failed:', error);
      throw error;
    } finally {
      if (page) {
        await page.close();
      }
    }
  }, 30000);
});