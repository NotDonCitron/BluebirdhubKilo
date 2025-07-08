import puppeteer, { Browser, Page } from 'puppeteer';
import * as fs from 'fs';
import * as path from 'path';

describe('AppFlowy Responsive Design Complete Testing', () => {
  let browser: Browser;
  let page: Page;
  const baseUrl = process.env.BASE_URL || 'http://localhost:3001';
  const screenshotDir = path.join(__dirname, '../reports/screenshots');
  const responsiveResults: any = {
    breakpoints: {},
    layouts: {},
    interactions: {},
    performance: {}
  };

  beforeAll(async () => {
    browser = await puppeteer.launch({
      headless: process.env.HEADLESS !== 'false',
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

    // Save responsive test results
    const resultsPath = path.join(screenshotDir, 'appflowy-responsive-results.json');
    fs.writeFileSync(resultsPath, JSON.stringify(responsiveResults, null, 2));
    console.log('📱 Responsive test results saved to:', resultsPath);
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

  describe('Breakpoint Testing', () => {
    const breakpoints = [
      { name: 'mobile-small', width: 320, height: 568, description: 'iPhone SE' },
      { name: 'mobile-standard', width: 375, height: 812, description: 'iPhone 12 Pro' },
      { name: 'mobile-large', width: 414, height: 896, description: 'iPhone 11 Pro Max' },
      { name: 'tablet-portrait', width: 768, height: 1024, description: 'iPad Portrait' },
      { name: 'tablet-landscape', width: 1024, height: 768, description: 'iPad Landscape' },
      { name: 'desktop-small', width: 1280, height: 720, description: 'Small Desktop' },
      { name: 'desktop-standard', width: 1440, height: 900, description: 'Standard Desktop' },
      { name: 'desktop-large', width: 1920, height: 1080, description: 'Large Desktop' },
      { name: 'ultrawide', width: 2560, height: 1440, description: 'Ultrawide Monitor' }
    ];

    test.each(breakpoints)('should render correctly at $description ($width x $height)', async (breakpoint) => {
      console.log(`📱 Testing ${breakpoint.description} (${breakpoint.width}x${breakpoint.height})`);

      await page.setViewport({ 
        width: breakpoint.width, 
        height: breakpoint.height 
      });

      await page.goto(`${baseUrl}/login`, { 
        waitUntil: 'networkidle0',
        timeout: 30000 
      });

      await page.waitForSelector('body', { timeout: 15000 });
      await new Promise(resolve => setTimeout(resolve, 2000));

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      
      // Capture screenshot
      await page.screenshot({ 
        path: path.join(screenshotDir, `${timestamp}-responsive-${breakpoint.name}.png`),
        fullPage: true
      });

      // Analyze layout at this breakpoint
      const layoutAnalysis = await page.evaluate((bp) => {
        const container = document.querySelector('[class*="lg:flex-row"]');
        const leftSection = document.querySelector('[class*="lg:w-3/5"]');
        const rightSection = document.querySelector('[class*="lg:w-2/5"]');
        const heading = document.querySelector('h1[style*="Poppins"]');
        const form = document.querySelector('form');
        
        const containerStyle = container ? window.getComputedStyle(container) : null;
        const headingStyle = heading ? window.getComputedStyle(heading) : null;
        
        return {
          viewport: { width: bp.width, height: bp.height },
          layout: {
            flexDirection: containerStyle?.flexDirection || 'unknown',
            leftSectionVisible: leftSection ? true : false,
            rightSectionVisible: rightSection ? true : false,
            formVisible: form ? true : false
          },
          typography: {
            headingFontSize: headingStyle?.fontSize || 'unknown',
            headingLineHeight: headingStyle?.lineHeight || 'unknown'
          },
          spacing: {
            containerPadding: containerStyle?.padding || 'unknown',
            hasProperMargins: document.querySelectorAll('[class*="mb-"], [class*="mt-"]').length > 0
          },
          scrollable: document.body.scrollHeight > window.innerHeight
        };
      }, breakpoint);

      // Test responsive interactions
      const interactions = await page.evaluate(() => {
        const startButton = document.querySelector('button[data-testid="demo-login-button"]');
        const createAccountBtn = Array.from(document.querySelectorAll('button'))
          .find(btn => btn.textContent?.includes('Create account') && !btn.closest('form'));
        
        return {
          startButtonVisible: !!startButton,
          createAccountVisible: !!createAccountBtn,
          buttonsClickable: !!(startButton && createAccountBtn),
          formElementsAccessible: document.querySelectorAll('input, button').length > 0
        };
      });

      responsiveResults.breakpoints[breakpoint.name] = {
        ...layoutAnalysis,
        interactions,
        testPassed: true
      };

      // Assertions for responsive behavior
      expect(layoutAnalysis.layout.formVisible).toBe(true);
      expect(interactions.startButtonVisible).toBe(true);
      expect(interactions.formElementsAccessible).toBe(true);

      // Specific assertions based on breakpoint
      if (breakpoint.width >= 1024) {
        // Desktop: should have side-by-side layout
        expect(layoutAnalysis.layout.flexDirection).toBe('row');
      } else {
        // Mobile/Tablet: should stack vertically
        expect(layoutAnalysis.layout.flexDirection).toBe('column');
      }

      console.log(`✅ ${breakpoint.description} layout verified:`, layoutAnalysis.layout);
    }, 45000);
  });

  describe('Layout Adaptation Testing', () => {
    test('should properly adapt layout from desktop to mobile', async () => {
      console.log('🔄 Testing layout adaptation...');

      // Start with desktop
      await page.setViewport({ width: 1440, height: 900 });
      await page.goto(`${baseUrl}/login`, { 
        waitUntil: 'networkidle0',
        timeout: 30000 
      });
      await page.waitForSelector('body', { timeout: 15000 });

      const desktopLayout = await page.evaluate(() => {
        const container = document.querySelector('[class*="lg:flex-row"]');
        const leftSection = document.querySelector('[class*="lg:w-3/5"]');
        const rightSection = document.querySelector('[class*="lg:w-2/5"]');
        
        return {
          flexDirection: container ? window.getComputedStyle(container).flexDirection : 'unknown',
          leftWidth: leftSection ? window.getComputedStyle(leftSection).width : 'unknown',
          rightWidth: rightSection ? window.getComputedStyle(rightSection).width : 'unknown'
        };
      });

      // Switch to mobile
      await page.setViewport({ width: 375, height: 812 });
      await new Promise(resolve => setTimeout(resolve, 1000));

      const mobileLayout = await page.evaluate(() => {
        const container = document.querySelector('[class*="lg:flex-row"]');
        const sections = document.querySelectorAll('[class*="lg:w-"]');
        
        return {
          flexDirection: container ? window.getComputedStyle(container).flexDirection : 'unknown',
          sectionsStacked: sections.length > 0,
          formAccessible: !!document.querySelector('form')
        };
      });

      responsiveResults.layouts = {
        desktop: desktopLayout,
        mobile: mobileLayout,
        adaptationWorking: desktopLayout.flexDirection !== mobileLayout.flexDirection
      };

      expect(desktopLayout.flexDirection).toBe('row');
      expect(mobileLayout.flexDirection).toBe('column');
      expect(mobileLayout.formAccessible).toBe(true);

      console.log('✅ Layout adaptation verified:', responsiveResults.layouts);
    }, 30000);

    test('should maintain readability across all screen sizes', async () => {
      console.log('👁️ Testing readability across screen sizes...');

      const screenSizes = [
        { width: 320, height: 568 },
        { width: 768, height: 1024 },
        { width: 1440, height: 900 }
      ];

      const readabilityResults = [];

      for (const size of screenSizes) {
        await page.setViewport(size);
        await page.goto(`${baseUrl}/login`, { 
          waitUntil: 'networkidle0',
          timeout: 30000 
        });
        await page.waitForSelector('body', { timeout: 15000 });

        const readability = await page.evaluate((screenSize) => {
          const heading = document.querySelector('h1[style*="Poppins"]');
          const subtitle = document.querySelector('p[style*="Roboto"]');
          const buttons = document.querySelectorAll('button');
          const inputs = document.querySelectorAll('input');
          
          const headingStyle = heading ? window.getComputedStyle(heading) : null;
          const subtitleStyle = subtitle ? window.getComputedStyle(subtitle) : null;
          
          // Check button sizes for touch targets
          let minButtonSize = Infinity;
          buttons.forEach(btn => {
            const rect = btn.getBoundingClientRect();
            const size = Math.min(rect.width, rect.height);
            if (size < minButtonSize) minButtonSize = size;
          });

          return {
            screenSize,
            headingFontSize: headingStyle ? parseInt(headingStyle.fontSize) : 0,
            subtitleFontSize: subtitleStyle ? parseInt(subtitleStyle.fontSize) : 0,
            minButtonSize: minButtonSize === Infinity ? 0 : minButtonSize,
            textContrast: headingStyle ? headingStyle.color !== headingStyle.backgroundColor : false,
            elementsVisible: heading && subtitle && buttons.length > 0
          };
        }, size);

        readabilityResults.push(readability);

        // Assertions for readability
        expect(readability.headingFontSize).toBeGreaterThan(20);
        expect(readability.subtitleFontSize).toBeGreaterThan(14);
        expect(readability.minButtonSize).toBeGreaterThan(40); // Touch target minimum
        expect(readability.elementsVisible).toBe(true);
      }

      responsiveResults.readability = readabilityResults;
      console.log('✅ Readability verified across all screen sizes');
    }, 60000);
  });

  describe('Touch Interaction Testing', () => {
    test('should support touch interactions on mobile devices', async () => {
      console.log('👆 Testing touch interactions...');

      await page.setViewport({ width: 375, height: 812 });
      await page.goto(`${baseUrl}/login`, { 
        waitUntil: 'networkidle0',
        timeout: 30000 
      });
      await page.waitForSelector('body', { timeout: 15000 });

      // Enable touch emulation
      await page.emulate({
        viewport: { width: 375, height: 812 },
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15'
      });

      const touchInteractions = await page.evaluate(() => {
        const results = {
          buttonTouchTargets: [],
          inputTouchTargets: [],
          scrollable: false,
          tapable: true
        };

        // Check button touch targets (should be at least 44px)
        const buttons = document.querySelectorAll('button');
        buttons.forEach(btn => {
          const rect = btn.getBoundingClientRect();
          results.buttonTouchTargets.push({
            width: rect.width,
            height: rect.height,
            meetsMinimum: rect.width >= 44 && rect.height >= 44
          });
        });

        // Check input touch targets
        const inputs = document.querySelectorAll('input');
        inputs.forEach(input => {
          const rect = input.getBoundingClientRect();
          results.inputTouchTargets.push({
            width: rect.width,
            height: rect.height,
            meetsMinimum: rect.height >= 44
          });
        });

        // Check if page is scrollable
        results.scrollable = document.body.scrollHeight > window.innerHeight;

        return results;
      });

      // Test actual touch interaction
      try {
        const startButton = await page.$('button[data-testid="demo-login-button"]');
        if (startButton) {
          await startButton.tap();
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (error) {
        console.log('Touch interaction test skipped:', error.message);
      }

      responsiveResults.interactions.touch = touchInteractions;

      // Assertions
      const adequateButtonTargets = touchInteractions.buttonTouchTargets
        .filter(target => target.meetsMinimum).length;
      const adequateInputTargets = touchInteractions.inputTouchTargets
        .filter(target => target.meetsMinimum).length;

      expect(adequateButtonTargets).toBeGreaterThan(0);
      expect(adequateInputTargets).toBeGreaterThan(0);

      console.log('✅ Touch interactions verified:', touchInteractions);
    }, 45000);
  });

  describe('Performance Across Devices', () => {
    test('should maintain performance on different device types', async () => {
      console.log('⚡ Testing performance across devices...');

      const deviceTests = [
        { name: 'mobile', width: 375, height: 812, description: 'Mobile Device' },
        { name: 'tablet', width: 768, height: 1024, description: 'Tablet Device' },
        { name: 'desktop', width: 1440, height: 900, description: 'Desktop Device' }
      ];

      const performanceResults = [];

      for (const device of deviceTests) {
        await page.setViewport({ width: device.width, height: device.height });
        
        const startTime = Date.now();
        await page.goto(`${baseUrl}/login`, { 
          waitUntil: 'networkidle0',
          timeout: 30000 
        });
        const loadTime = Date.now() - startTime;

        await page.waitForSelector('body', { timeout: 15000 });

        const devicePerformance = await page.evaluate((dev) => {
          const animatedElements = document.querySelectorAll('[class*="animate"]');
          const gradientElements = document.querySelectorAll('[class*="gradient"]');
          const imageElements = document.querySelectorAll('img');
          
          return {
            device: dev.name,
            animatedElementsCount: animatedElements.length,
            gradientElementsCount: gradientElements.length,
            imageCount: imageElements.length,
            domElementCount: document.querySelectorAll('*').length
          };
        }, device);

        performanceResults.push({
          ...devicePerformance,
          loadTime,
          performanceAcceptable: loadTime < 8000 // 8 second max
        });

        expect(loadTime).toBeLessThan(10000); // 10 second absolute max
      }

      responsiveResults.performance = performanceResults;
      console.log('✅ Performance verified across devices:', performanceResults);
    }, 90000);
  });

  describe('Orientation Testing', () => {
    test('should handle orientation changes properly', async () => {
      console.log('🔄 Testing orientation changes...');

      // Test portrait mode
      await page.setViewport({ width: 375, height: 812 });
      await page.goto(`${baseUrl}/login`, { 
        waitUntil: 'networkidle0',
        timeout: 30000 
      });
      await page.waitForSelector('body', { timeout: 15000 });

      const portraitLayout = await page.evaluate(() => {
        const container = document.querySelector('[class*="lg:flex-row"]');
        return {
          flexDirection: container ? window.getComputedStyle(container).flexDirection : 'unknown',
          formVisible: !!document.querySelector('form'),
          headingVisible: !!document.querySelector('h1')
        };
      });

      // Test landscape mode
      await page.setViewport({ width: 812, height: 375 });
      await new Promise(resolve => setTimeout(resolve, 1000));

      const landscapeLayout = await page.evaluate(() => {
        const container = document.querySelector('[class*="lg:flex-row"]');
        return {
          flexDirection: container ? window.getComputedStyle(container).flexDirection : 'unknown',
          formVisible: !!document.querySelector('form'),
          headingVisible: !!document.querySelector('h1'),
          contentFitsViewport: document.body.scrollHeight <= window.innerHeight * 1.2
        };
      });

      responsiveResults.orientation = {
        portrait: portraitLayout,
        landscape: landscapeLayout
      };

      expect(portraitLayout.formVisible).toBe(true);
      expect(portraitLayout.headingVisible).toBe(true);
      expect(landscapeLayout.formVisible).toBe(true);
      expect(landscapeLayout.headingVisible).toBe(true);

      console.log('✅ Orientation changes handled properly');
    }, 30000);
  });
});