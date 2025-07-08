import { performance } from 'perf_hooks';
import { setupGlobal, teardownGlobal, testBrowser, logger } from '../../tests/e2e/setup';
import { TestHelpers } from '../../tests/utils/helpers';
import { Page } from 'puppeteer';
import fs from 'fs/promises';
import path from 'path';

describe('Upload Speed Performance Tests', () => {
  let helpers: TestHelpers;
  let page: Page;
  let testFilesDir: string;

  beforeAll(async () => {
    await setupGlobal();
    page = await testBrowser.newPage('upload-speed-performance');
    helpers = new TestHelpers(page);
    testFilesDir = path.join(process.cwd(), 'speed-test-files');

    // Create test files directory
    await fs.mkdir(testFilesDir, { recursive: true });

    // Login
    const loginResult = await helpers.login();
    expect(loginResult.success).toBe(true);

    logger.info('Upload speed performance tests initialized');
  });

  afterAll(async () => {
    // Clean up test files
    try {
      await fs.rm(testFilesDir, { recursive: true, force: true });
    } catch (error) {
      logger.warn('Failed to clean up speed test files:', error);
    }

    await teardownGlobal();
    logger.info('Upload speed performance tests completed');
  });

  beforeEach(async () => {
    await helpers.navigateTo('/dashboard/files');
    await page.waitForTimeout(2000);
  });

  test('should benchmark small file upload speed', async () => {
    logger.info('Benchmarking small file upload speed');

    const testFile = path.join(testFilesDir, 'small-speed-test.txt');
    const fileSize = 1024 * 10; // 10KB
    await fs.writeFile(testFile, 'x'.repeat(fileSize));

    const startTime = performance.now();
    
    const fileInput = await page.$('input[type="file"]');
    if (!fileInput) {
      throw new Error('File input not found');
    }

    await fileInput.uploadFile(testFile);
    
    // Wait for upload completion
    await page.waitForFunction(() => {
      const progressElements = document.querySelectorAll('[data-testid*="progress"], .upload-progress');
      const fileItems = document.querySelectorAll('[data-testid*="file"], .file-item');
      
      // Check for completion by progress or file appearance
      const hasProgress = Array.from(progressElements).some(el => 
        el.textContent && el.textContent.includes('100%')
      );
      
      const hasFile = Array.from(fileItems).some(el =>
        el.textContent && el.textContent.includes('small-speed-test.txt')
      );
      
      return hasProgress || hasFile;
    }, { timeout: 15000 });

    const endTime = performance.now();
    const uploadTime = endTime - startTime;
    const uploadSpeed = (fileSize / (uploadTime / 1000)) / 1024; // KB/s

    expect(uploadTime).toBeLessThan(10000); // Should complete in <10s
    expect(uploadSpeed).toBeGreaterThan(1); // > 1 KB/s

    logger.success(`Small file upload benchmark - Time: ${uploadTime.toFixed(2)}ms, Speed: ${uploadSpeed.toFixed(2)} KB/s`);
  });
});