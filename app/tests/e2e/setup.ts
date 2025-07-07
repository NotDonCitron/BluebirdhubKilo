import puppeteer, { Browser, Page } from 'puppeteer';
import { join } from 'path';
import { mkdirSync, existsSync } from 'fs';

export interface TestConfig {
  baseUrl: string;
  timeout: number;
  screenshotPath: string;
  headless: boolean;
  credentials: {
    email: string;
    password: string;
  };
}

export const config: TestConfig = {
  baseUrl: process.env.BASE_URL || 'http://localhost:3000',
  timeout: 60000, // Increased to 60 seconds
  screenshotPath: join(__dirname, '../reports/screenshots'),
  headless: process.env.HEADLESS !== 'false',
  credentials: {
    email: 'john@doe.com',
    password: 'johndoe123'
  }
};

export class TestBrowser {
  private browser: Browser | null = null;
  private pages: Map<string, Page> = new Map();

  async launch(): Promise<void> {
    this.browser = await puppeteer.launch({
      headless: config.headless,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-gpu',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        '--disable-extensions',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
        '--disable-ipc-flooding-protection',
        '--memory-pressure-off'
      ],
      defaultViewport: {
        width: 1366,
        height: 768
      },
      // Use pipe mode to avoid WebSocket transport issues
      pipe: true,
      timeout: 60000 // Browser launch timeout
    });

    // Create screenshots directory
    if (!existsSync(config.screenshotPath)) {
      mkdirSync(config.screenshotPath, { recursive: true });
    }
  }

  async newPage(pageId: string = 'main'): Promise<Page> {
    if (!this.browser) {
      throw new Error('Browser not launched. Call launch() first.');
    }

    const page = await this.browser.newPage();
    
    // Set longer timeout for all operations
    page.setDefaultTimeout(config.timeout);
    
    // Only enable logging in verbose mode to improve performance
    if (process.env.VERBOSE === 'true') {
      // Enable request interception for debugging
      await page.setRequestInterception(true);
      page.on('request', (request) => {
        console.log(`[${pageId}] Request: ${request.method()} ${request.url()}`);
        request.continue();
      });

      // Log console messages from the page
      page.on('console', (msg) => {
        console.log(`[${pageId}] Console: ${msg.text()}`);
      });
    }

    // Always log page errors for debugging
    page.on('pageerror', (error) => {
      console.error(`[${pageId}] Page error: ${error.message}`);
    });

    this.pages.set(pageId, page);
    return page;
  }

  getPage(pageId: string = 'main'): Page {
    const page = this.pages.get(pageId);
    if (!page) {
      throw new Error(`Page with ID '${pageId}' not found. Create it with newPage() first.`);
    }
    return page;
  }

  async screenshot(pageId: string, name: string, fullPage: boolean = true): Promise<string> {
    const page = this.getPage(pageId);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${timestamp}-${pageId}-${name}.png`;
    const filepath = join(config.screenshotPath, filename);
    
    await page.screenshot({
      path: filepath,
      fullPage
    });
    
    console.log(`Screenshot saved: ${filename}`);
    return filepath;
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.pages.clear();
    }
  }
}

export class TestLogger {
  private logs: Array<{
    timestamp: string;
    level: 'info' | 'warn' | 'error' | 'success';
    message: string;
    details?: any;
  }> = [];

  log(level: 'info' | 'warn' | 'error' | 'success', message: string, details?: any): void {
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      details
    };
    
    this.logs.push(entry);
    
    const emoji = {
      info: 'ℹ️',
      warn: '⚠️',
      error: '❌',
      success: '✅'
    };
    
    console.log(`${emoji[level]} [${entry.timestamp}] ${message}`);
    if (details) {
      console.log('  Details:', details);
    }
  }

  info(message: string, details?: any): void {
    this.log('info', message, details);
  }

  warn(message: string, details?: any): void {
    this.log('warn', message, details);
  }

  error(message: string, details?: any): void {
    this.log('error', message, details);
  }

  success(message: string, details?: any): void {
    this.log('success', message, details);
  }

  getLogs(): Array<any> {
    return [...this.logs];
  }

  generateReport(): string {
    const summary = {
      total: this.logs.length,
      info: this.logs.filter(log => log.level === 'info').length,
      warn: this.logs.filter(log => log.level === 'warn').length,
      error: this.logs.filter(log => log.level === 'error').length,
      success: this.logs.filter(log => log.level === 'success').length
    };

    let report = `# Test Execution Report\n\n`;
    report += `**Generated:** ${new Date().toISOString()}\n\n`;
    report += `## Summary\n`;
    report += `- Total Events: ${summary.total}\n`;
    report += `- Success: ${summary.success}\n`;
    report += `- Info: ${summary.info}\n`;
    report += `- Warnings: ${summary.warn}\n`;
    report += `- Errors: ${summary.error}\n\n`;
    
    report += `## Detailed Log\n\n`;
    this.logs.forEach((log, index) => {
      const emoji = {
        info: 'ℹ️',
        warn: '⚠️',
        error: '❌',
        success: '✅'
      };
      
      report += `### ${index + 1}. ${emoji[log.level]} ${log.message}\n`;
      report += `**Time:** ${log.timestamp}\n`;
      if (log.details) {
        report += `**Details:** \`${JSON.stringify(log.details, null, 2)}\`\n`;
      }
      report += `\n`;
    });

    return report;
  }
}

export const waitForElement = async (page: Page, selector: string, timeout: number = config.timeout): Promise<void> => {
  try {
    await page.waitForSelector(selector, { timeout });
  } catch (error) {
    throw new Error(`Element '${selector}' not found within ${timeout}ms`);
  }
};

export const waitForNavigation = async (page: Page, expectedUrl?: string): Promise<void> => {
  await page.waitForNavigation({ waitUntil: 'networkidle0' });
  
  if (expectedUrl) {
    const currentUrl = page.url();
    if (!currentUrl.includes(expectedUrl)) {
      throw new Error(`Expected URL to contain '${expectedUrl}', but got '${currentUrl}'`);
    }
  }
};

export const fillForm = async (page: Page, formData: Record<string, string>): Promise<void> => {
  for (const [selector, value] of Object.entries(formData)) {
    await waitForElement(page, selector);
    await page.type(selector, value);
    await new Promise(resolve => setTimeout(resolve, 100)); // Small delay between fields
  }
};

export const clickAndWait = async (page: Page, selector: string, waitForSelector?: string): Promise<void> => {
  await waitForElement(page, selector);
  await page.click(selector);
  
  if (waitForSelector) {
    await waitForElement(page, waitForSelector);
  } else {
    await new Promise(resolve => setTimeout(resolve, 1000)); // Default wait
  }
};

// Global test instance
export let testBrowser: TestBrowser;
export let logger: TestLogger;

export const setupGlobal = async (): Promise<void> => {
  testBrowser = new TestBrowser();
  logger = new TestLogger();
  await testBrowser.launch();
  logger.info('Test environment initialized');
};

export const teardownGlobal = async (): Promise<void> => {
  if (testBrowser) {
    await testBrowser.close();
    logger.info('Test environment cleaned up');
  }
};