/**
 * AppFlowy.com Design Analysis & Screenshot Capture
 * 
 * This test captures comprehensive screenshots and analyzes design patterns
 * from AppFlowy.com to inspire the AbacusHub redesign.
 */

import { TestBrowser, config } from './setup';
import { takeScreenshot, createVisualReport } from '../utils/helpers';
import * as fs from 'fs';
import * as path from 'path';

describe('AppFlowy Design Analysis', () => {
  let testBrowser: TestBrowser;
  let page: any;
  const screenshots: Array<{name: string, path: string, description: string, timestamp: string}> = [];
  const designAnalysis: any = {};
  
  const APPFLOWY_URL = 'https://appflowy.com';
  
  beforeAll(async () => {
    config.headless = false; // Show browser for visual confirmation
    
    testBrowser = new TestBrowser();
    await testBrowser.launch();
    page = await testBrowser.newPage('appflowy-analysis');
    
    console.log(`🎨 Starting AppFlowy design analysis: ${APPFLOWY_URL}`);
  }, 120000);

  afterAll(async () => {
    // Save complete design analysis
    const analysisPath = path.join(config.screenshotPath, 'appflowy-design-analysis.json');
    fs.writeFileSync(analysisPath, JSON.stringify(designAnalysis, null, 2));
    
    // Generate visual report
    await createVisualReport(screenshots, 'appflowy-design-analysis');
    
    await testBrowser.close();
    console.log(`📸 AppFlowy analysis complete. Data saved to: ${config.screenshotPath}`);
  });

  describe('Homepage Design Capture', () => {
    it('should capture full homepage with all sections', async () => {
      console.log('📸 Capturing AppFlowy homepage...');
      
      await page.goto(APPFLOWY_URL, { 
        waitUntil: ['networkidle0', 'domcontentloaded'],
        timeout: 60000 
      });
      
      // Wait for page to fully render
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Capture full homepage
      const homepageScreenshot = await takeScreenshot(page, 'appflowy-homepage-full', {
        fullPage: true
      });
      
      screenshots.push({
        name: 'AppFlowy Homepage - Complete',
        path: homepageScreenshot,
        description: 'Full homepage showing all sections, hero, features, and footer',
        timestamp: new Date().toISOString()
      });
      
      console.log('✅ Full homepage captured');
    }, 90000);

    it('should capture responsive design at different viewports', async () => {
      console.log('📱 Analyzing responsive design...');
      
      const viewports = [
        { name: 'mobile', width: 375, height: 812, description: 'Mobile iPhone 12 Pro' },
        { name: 'tablet', width: 768, height: 1024, description: 'Tablet iPad' },
        { name: 'desktop', width: 1440, height: 900, description: 'Desktop Large' },
        { name: 'ultrawide', width: 1920, height: 1080, description: 'Desktop Ultrawide' }
      ];
      
      for (const viewport of viewports) {
        await page.setViewport({ width: viewport.width, height: viewport.height });
        await page.goto(APPFLOWY_URL, { waitUntil: 'networkidle0' });
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const screenshotPath = await takeScreenshot(page, `appflowy-${viewport.name}`, {
          fullPage: true
        });
        
        screenshots.push({
          name: `AppFlowy - ${viewport.name.toUpperCase()}`,
          path: screenshotPath,
          description: `${viewport.description} (${viewport.width}x${viewport.height})`,
          timestamp: new Date().toISOString()
        });
        
        console.log(`✅ ${viewport.name} viewport captured`);
      }
    }, 120000);

    it('should analyze design system elements', async () => {
      console.log('🎨 Extracting design system...');
      
      await page.setViewport({ width: 1440, height: 900 });
      await page.goto(APPFLOWY_URL, { waitUntil: 'networkidle0' });
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Extract design system information
      const designSystem = await page.evaluate(() => {
        // Extract colors from CSS
        const getComputedColor = (selector: string, property: string = 'color') => {
          const element = document.querySelector(selector);
          return element ? window.getComputedStyle(element).getPropertyValue(property) : null;
        };
        
        // Extract typography
        const getTypography = (selector: string) => {
          const element = document.querySelector(selector);
          if (!element) return null;
          const styles = window.getComputedStyle(element);
          return {
            fontFamily: styles.fontFamily,
            fontSize: styles.fontSize,
            fontWeight: styles.fontWeight,
            lineHeight: styles.lineHeight,
            letterSpacing: styles.letterSpacing
          };
        };
        
        // Extract spacing and layout
        const getSpacing = (selector: string) => {
          const element = document.querySelector(selector);
          if (!element) return null;
          const styles = window.getComputedStyle(element);
          return {
            margin: styles.margin,
            padding: styles.padding,
            gap: styles.gap
          };
        };
        
        return {
          colors: {
            primary: getComputedColor('button, .btn, [class*="primary"]', 'background-color'),
            secondary: getComputedColor('h1, h2, .title', 'color'),
            text: getComputedColor('p, .text', 'color'),
            background: getComputedColor('body', 'background-color'),
            border: getComputedColor('button, .btn', 'border-color')
          },
          typography: {
            heading1: getTypography('h1'),
            heading2: getTypography('h2'),
            heading3: getTypography('h3'),
            body: getTypography('p'),
            button: getTypography('button, .btn')
          },
          layout: {
            container: getSpacing('.container, [class*="container"]'),
            section: getSpacing('section'),
            card: getSpacing('.card, [class*="card"]')
          },
          animations: {
            hasTransitions: Array.from(document.querySelectorAll('*')).some(el => 
              window.getComputedStyle(el).transition !== 'all 0s ease 0s'
            ),
            hasTransforms: Array.from(document.querySelectorAll('*')).some(el => 
              window.getComputedStyle(el).transform !== 'none'
            )
          }
        };
      });
      
      designAnalysis.designSystem = designSystem;
      console.log('🎨 Design system extracted:', designSystem);
    }, 60000);

    it('should analyze content structure and messaging', async () => {
      console.log('📝 Analyzing content structure...');
      
      await page.goto(APPFLOWY_URL, { waitUntil: 'networkidle0' });
      
      // Extract content structure
      const contentAnalysis = await page.evaluate(() => {
        // Extract headings hierarchy
        const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6')).map(h => ({
          tag: h.tagName.toLowerCase(),
          text: h.textContent?.trim() || '',
          level: parseInt(h.tagName[1])
        }));
        
        // Extract CTA buttons
        const ctas = Array.from(document.querySelectorAll('button, .btn, a[class*="btn"], a[class*="button"]'))
          .map(btn => ({
            text: btn.textContent?.trim() || '',
            href: btn.getAttribute('href') || '',
            classes: btn.className || '',
            type: btn.tagName.toLowerCase()
          }));
        
        // Extract navigation structure
        const navItems = Array.from(document.querySelectorAll('nav a, header a, .nav a'))
          .map(link => ({
            text: link.textContent?.trim() || '',
            href: link.getAttribute('href') || ''
          }));
        
        // Extract value propositions (first few paragraphs/hero text)
        const valueProps = Array.from(document.querySelectorAll('p, .subtitle, .description'))
          .slice(0, 5)
          .map(p => p.textContent?.trim() || '')
          .filter(text => text.length > 20);
        
        return {
          headings,
          ctas,
          navigation: navItems,
          valuePropositions: valueProps,
          pageTitle: document.title,
          metaDescription: document.querySelector('meta[name="description"]')?.getAttribute('content') || ''
        };
      });
      
      designAnalysis.content = contentAnalysis;
      console.log('📝 Content structure analyzed');
    }, 60000);

    it('should capture key sections individually', async () => {
      console.log('🔍 Capturing individual sections...');
      
      await page.goto(APPFLOWY_URL, { waitUntil: 'networkidle0' });
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Find and capture key sections
      const sections = await page.evaluate(() => {
        const sectionElements = Array.from(document.querySelectorAll('section, .section, [class*="section"]'));
        return sectionElements.map((section, index) => ({
          index,
          id: section.id || `section-${index}`,
          classes: section.className,
          hasHeading: !!section.querySelector('h1, h2, h3'),
          headingText: section.querySelector('h1, h2, h3')?.textContent?.trim() || ''
        }));
      });
      
      // Capture hero section specifically
      try {
        const heroExists = await page.$('section, .hero, [class*="hero"]');
        if (heroExists) {
          const heroScreenshot = await takeScreenshot(page, 'appflowy-hero-section');
          screenshots.push({
            name: 'AppFlowy Hero Section',
            path: heroScreenshot,
            description: 'Main hero section with primary value proposition and CTA',
            timestamp: new Date().toISOString()
          });
        }
      } catch (error) {
        console.log('Hero section not found or not capturable');
      }
      
      designAnalysis.sections = sections;
      console.log(`🔍 Found ${sections.length} sections`);
    }, 90000);
  });

  describe('Technical Analysis', () => {
    it('should analyze performance and loading patterns', async () => {
      console.log('⚡ Analyzing performance...');
      
      const performanceData = await page.evaluate(() => {
        const performance = window.performance;
        const paintEntries = performance.getEntriesByType('paint');
        const navigationEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        
        return {
          loadTimes: {
            domContentLoaded: navigationEntry?.domContentLoadedEventEnd - navigationEntry?.navigationStart,
            pageLoad: navigationEntry?.loadEventEnd - navigationEntry?.navigationStart,
            firstPaint: paintEntries.find(entry => entry.name === 'first-paint')?.startTime,
            firstContentfulPaint: paintEntries.find(entry => entry.name === 'first-contentful-paint')?.startTime
          },
          resources: {
            cssFiles: Array.from(document.querySelectorAll('link[rel="stylesheet"]')).length,
            jsFiles: Array.from(document.querySelectorAll('script[src]')).length,
            images: Array.from(document.querySelectorAll('img')).length
          },
          technologies: {
            react: !!(window as any).React || !!document.querySelector('[data-reactroot]'),
            nextjs: !!(window as any).__NEXT_DATA__,
            vue: !!(window as any).Vue,
            angular: !!(window as any).ng
          }
        };
      });
      
      designAnalysis.performance = performanceData;
      console.log('⚡ Performance data collected');
    }, 60000);
  });
});