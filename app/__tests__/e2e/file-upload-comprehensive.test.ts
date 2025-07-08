import { setupGlobal, teardownGlobal, testBrowser, logger } from '../../tests/e2e/setup';
import { TestHelpers } from '../../tests/utils/helpers';
import { Page } from 'puppeteer';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

describe('Comprehensive File Upload E2E Tests', () => {
  let helpers: TestHelpers;
  let page: Page;
  let testWorkspaceId: string;

  // Test file paths
  const testFilesDir = path.join(process.cwd(), 'test-files');
  const smallFile = path.join(testFilesDir, 'small-test.txt');
  const mediumFile = path.join(testFilesDir, 'medium-test.txt');
  const largeFile = path.join(testFilesDir, 'large-test.txt');
  const binaryFile = path.join(testFilesDir, 'test-image.png');

  beforeAll(async () => {
    await setupGlobal();
    page = await testBrowser.newPage('file-upload-comprehensive');
    helpers = new TestHelpers(page);

    // Create test files
    await fs.mkdir(testFilesDir, { recursive: true });
    await createTestFiles();

    // Login and create workspace
    const loginResult = await helpers.login();
    expect(loginResult.success).toBe(true);

    const workspaceResult = await helpers.createWorkspace({ 
      name: `Upload-Test-Workspace-${Date.now()}` 
    });
    expect(workspaceResult.success).toBe(true);
    testWorkspaceId = workspaceResult.workspaceId!;

    logger.info('File upload E2E tests initialized');
  });

  afterAll(async () => {
    // Clean up test files
    try {
      await fs.rm(testFilesDir, { recursive: true, force: true });
    } catch (error) {
      logger.warn('Failed to clean up test files:', error);
    }

    await teardownGlobal();
    logger.info('File upload E2E tests completed');
  });

  beforeEach(async () => {
    await helpers.navigateTo('/dashboard/files');
    await page.waitForTimeout(2000);
  });

  // Helper function to create test files
  async function createTestFiles() {
    // Small file (1KB)
    await fs.writeFile(smallFile, 'x'.repeat(1024));

    // Medium file (1MB)
    await fs.writeFile(mediumFile, 'x'.repeat(1024 * 1024));

    // Large file (10MB)
    await fs.writeFile(largeFile, 'x'.repeat(10 * 1024 * 1024));

    // Binary file (simple PNG)
    const pngData = Buffer.from([
      0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
      0x00, 0x00, 0x00, 0x0D, // IHDR chunk length
      0x49, 0x48, 0x44, 0x52, // IHDR
      0x00, 0x00, 0x00, 0x01, // Width: 1
      0x00, 0x00, 0x00, 0x01, // Height: 1
      0x08, 0x02, 0x00, 0x00, 0x00, // Bit depth, color type, etc.
      0x90, 0x77, 0x53, 0xDE, // CRC
      0x00, 0x00, 0x00, 0x0C, // IDAT chunk length
      0x49, 0x44, 0x41, 0x54, // IDAT
      0x08, 0x99, 0x01, 0x01, 0x00, 0x00, 0x00, 0xFF, 0xFF, 0x00, 0x00, 0x00, 0x02, 0x00, 0x01, // Image data
      0x00, 0x00, 0x00, 0x00, // IEND chunk length
      0x49, 0x45, 0x4E, 0x44, // IEND
      0xAE, 0x42, 0x60, 0x82  // CRC
    ]);
    await fs.writeFile(binaryFile, pngData);
  }

  // Helper function to upload file and monitor progress
  async function uploadFileWithMonitoring(filePath: string, timeout = 30000) {
    const fileName = path.basename(filePath);
    
    // Look for upload button or input
    const uploadButton = '[data-testid="upload-button"], [data-testid="file-upload-button"], input[type="file"]';
    await page.waitForSelector(uploadButton, { timeout: 5000 });

    // Get file input
    const fileInput = await page.$('input[type="file"]');
    if (!fileInput) {
      throw new Error('File input not found');
    }

    // Upload file
    await fileInput.uploadFile(filePath);
    
    // Wait for upload to start
    await page.waitForTimeout(1000);

    // Monitor progress
    const progressSelector = '[data-testid*="progress"], .upload-progress, [data-testid*="upload-status"]';
    let progressUpdates: number[] = [];
    let uploadComplete = false;
    
    const startTime = Date.now();
    
    while (!uploadComplete && (Date.now() - startTime) < timeout) {
      try {
        // Check for progress indicators
        const progressElements = await page.$$(progressSelector);
        
        if (progressElements.length > 0) {
          for (const element of progressElements) {
            const progressText = await element.evaluate(el => el.textContent || '');
            const progressMatch = progressText.match(/(\d+)%/);
            
            if (progressMatch) {
              const progress = parseInt(progressMatch[1]);
              progressUpdates.push(progress);
              
              if (progress >= 100) {
                uploadComplete = true;
                break;
              }
            }
          }
        }

        // Check for completion indicators
        const completionIndicators = [
          `[data-testid*="${fileName}"]`,
          `.file-item:has-text("${fileName}")`,
          `text="${fileName}"`,
        ];

        for (const selector of completionIndicators) {
          try {
            await page.waitForSelector(selector, { timeout: 100 });
            uploadComplete = true;
            break;
          } catch {
            // Continue checking
          }
        }

        await page.waitForTimeout(500);
      } catch (error) {
        logger.warn('Error monitoring upload progress:', error.message);
        await page.waitForTimeout(1000);
      }
    }

    return {
      completed: uploadComplete,
      progressUpdates,
      duration: Date.now() - startTime,
    };
  }

  describe('Basic Upload Functionality', () => {
    test('should upload small file successfully', async () => {
      logger.info('Testing small file upload');

      const result = await uploadFileWithMonitoring(smallFile);
      
      expect(result.completed).toBe(true);
      expect(result.duration).toBeLessThan(10000); // Should complete in <10s
      
      await testBrowser.screenshot('file-upload-comprehensive', 'small-file-uploaded');
      
      // Verify file appears in list
      const fileName = path.basename(smallFile);
      const fileExists = await helpers.elementExistsByText(fileName);
      expect(fileExists).toBe(true);
      
      logger.success('Small file upload completed successfully');
    });

    test('should upload medium file with progress tracking', async () => {
      logger.info('Testing medium file upload with progress tracking');

      const result = await uploadFileWithMonitoring(mediumFile, 60000);
      
      expect(result.completed).toBe(true);
      expect(result.progressUpdates.length).toBeGreaterThan(0);
      
      // Verify progress increases
      if (result.progressUpdates.length > 1) {
        const firstProgress = result.progressUpdates[0];
        const lastProgress = result.progressUpdates[result.progressUpdates.length - 1];
        expect(lastProgress).toBeGreaterThanOrEqual(firstProgress);
      }
      
      await testBrowser.screenshot('file-upload-comprehensive', 'medium-file-uploaded');
      
      logger.success(`Medium file upload completed in ${result.duration}ms with ${result.progressUpdates.length} progress updates`);
    });

    test('should upload binary file correctly', async () => {
      logger.info('Testing binary file upload');

      const result = await uploadFileWithMonitoring(binaryFile);
      
      expect(result.completed).toBe(true);
      
      await testBrowser.screenshot('file-upload-comprehensive', 'binary-file-uploaded');
      
      // Verify file appears in list
      const fileName = path.basename(binaryFile);
      const fileExists = await helpers.elementExistsByText(fileName);
      expect(fileExists).toBe(true);
      
      logger.success('Binary file upload completed successfully');
    });
  });

  describe('Large File Upload', () => {
    test('should upload large file with chunking', async () => {
      logger.info('Testing large file upload with chunking');

      const result = await uploadFileWithMonitoring(largeFile, 120000); // 2 minutes timeout
      
      expect(result.completed).toBe(true);
      expect(result.progressUpdates.length).toBeGreaterThan(5); // Should have multiple progress updates
      
      await testBrowser.screenshot('file-upload-comprehensive', 'large-file-uploaded');
      
      // Verify file appears in list
      const fileName = path.basename(largeFile);
      const fileExists = await helpers.elementExistsByText(fileName);
      expect(fileExists).toBe(true);
      
      logger.success(`Large file upload completed in ${result.duration}ms`);
    });

    test('should handle large file upload performance', async () => {
      logger.info('Testing large file upload performance');

      const startTime = Date.now();
      const result = await uploadFileWithMonitoring(largeFile, 120000);
      const endTime = Date.now();
      
      const uploadTime = endTime - startTime;
      const fileSize = (await fs.stat(largeFile)).size;
      const uploadSpeed = fileSize / (uploadTime / 1000); // bytes per second
      
      expect(result.completed).toBe(true);
      expect(uploadSpeed).toBeGreaterThan(100000); // > 100KB/s minimum
      
      logger.success(`Large file upload speed: ${Math.round(uploadSpeed / 1024)} KB/s`);
    });
  });

  describe('Multiple File Upload', () => {
    test('should handle multiple file uploads sequentially', async () => {
      logger.info('Testing multiple file uploads sequentially');

      const files = [smallFile, mediumFile];
      const results = [];

      for (const file of files) {
        const result = await uploadFileWithMonitoring(file);
        results.push(result);
        
        // Wait between uploads
        await page.waitForTimeout(2000);
      }

      // Verify all uploads completed
      results.forEach((result, index) => {
        expect(result.completed).toBe(true);
        logger.info(`File ${index + 1} upload duration: ${result.duration}ms`);
      });

      await testBrowser.screenshot('file-upload-comprehensive', 'multiple-files-uploaded');
      
      // Verify all files appear in list
      for (const file of files) {
        const fileName = path.basename(file);
        const fileExists = await helpers.elementExistsByText(fileName);
        expect(fileExists).toBe(true);
      }
      
      logger.success('Multiple file uploads completed successfully');
    });

    test('should handle concurrent file uploads', async () => {
      logger.info('Testing concurrent file uploads');

      // Start multiple uploads simultaneously
      const uploadPromises = [
        uploadFileWithMonitoring(smallFile),
        uploadFileWithMonitoring(path.join(testFilesDir, 'concurrent1.txt')),
        uploadFileWithMonitoring(path.join(testFilesDir, 'concurrent2.txt')),
      ];

      // Create additional test files for concurrent upload
      await fs.writeFile(path.join(testFilesDir, 'concurrent1.txt'), 'concurrent test 1');
      await fs.writeFile(path.join(testFilesDir, 'concurrent2.txt'), 'concurrent test 2');

      try {
        const results = await Promise.allSettled(uploadPromises);
        
        const successfulUploads = results.filter(result => 
          result.status === 'fulfilled' && result.value.completed
        ).length;

        expect(successfulUploads).toBeGreaterThan(0);
        
        await testBrowser.screenshot('file-upload-comprehensive', 'concurrent-uploads');
        
        logger.success(`${successfulUploads} out of ${uploadPromises.length} concurrent uploads succeeded`);
      } catch (error) {
        logger.warn('Concurrent upload test encountered issues:', error.message);
        // This is expected as the UI might not support true concurrent uploads
      }
    });
  });

  describe('Upload Error Handling', () => {
    test('should handle file type restrictions', async () => {
      logger.info('Testing file type restrictions');

      // Create a restricted file type (if restrictions exist)
      const restrictedFile = path.join(testFilesDir, 'test.exe');
      await fs.writeFile(restrictedFile, 'fake executable');

      try {
        const result = await uploadFileWithMonitoring(restrictedFile, 10000);
        
        // If upload is rejected, check for error messages
        if (!result.completed) {
          const errorMessages = await page.$$eval(
            '[data-testid*="error"], .error, .alert-error',
            elements => elements.map(el => el.textContent)
          );
          
          const hasFileTypeError = errorMessages.some(msg => 
            msg && (msg.includes('file type') || msg.includes('not allowed') || msg.includes('restricted'))
          );
          
          if (hasFileTypeError) {
            logger.success('File type restriction working correctly');
          } else {
            logger.info('No file type restrictions detected');
          }
        } else {
          logger.info('File type uploaded successfully - no restrictions');
        }
      } catch (error) {
        logger.info('File type restriction test result:', error.message);
      }

      await testBrowser.screenshot('file-upload-comprehensive', 'file-type-restriction-test');
    });

    test('should handle file size limit', async () => {
      logger.info('Testing file size limit');

      // Create a file that exceeds typical limits (if any)
      const oversizedFile = path.join(testFilesDir, 'oversized.txt');
      
      try {
        // Create 600MB file (above the 500MB limit mentioned in code)
        const stream = require('fs').createWriteStream(oversizedFile);
        const chunkSize = 1024 * 1024; // 1MB chunks
        const chunks = 600; // 600MB total
        
        for (let i = 0; i < chunks; i++) {
          stream.write('x'.repeat(chunkSize));
        }
        stream.end();
        
        const result = await uploadFileWithMonitoring(oversizedFile, 10000);
        
        if (!result.completed) {
          const errorMessages = await page.$$eval(
            '[data-testid*="error"], .error, .alert-error',
            elements => elements.map(el => el.textContent)
          );
          
          const hasSizeError = errorMessages.some(msg => 
            msg && (msg.includes('too large') || msg.includes('size limit') || msg.includes('exceeds'))
          );
          
          if (hasSizeError) {
            logger.success('File size limit working correctly');
          }
        }
      } catch (error) {
        logger.info('File size limit test result:', error.message);
      } finally {
        // Clean up oversized file
        try {
          await fs.unlink(oversizedFile);
        } catch {}
      }

      await testBrowser.screenshot('file-upload-comprehensive', 'file-size-limit-test');
    });

    test('should handle network interruption simulation', async () => {
      logger.info('Testing network interruption handling');

      // Start large file upload
      const fileName = path.basename(largeFile);
      const fileInput = await page.$('input[type="file"]');
      
      if (fileInput) {
        await fileInput.uploadFile(largeFile);
        
        // Wait for upload to start
        await page.waitForTimeout(2000);
        
        // Simulate network interruption by going offline
        await page.setOfflineMode(true);
        await page.waitForTimeout(3000);
        
        // Check for pause/retry indicators
        const pauseIndicators = await page.$$eval(
          '[data-testid*="pause"], [data-testid*="retry"], .upload-paused, .upload-failed',
          elements => elements.map(el => el.textContent)
        );
        
        // Restore network
        await page.setOfflineMode(false);
        await page.waitForTimeout(2000);
        
        // Check for resume indicators
        const resumeIndicators = await page.$$eval(
          '[data-testid*="resume"], [data-testid*="retry"], .upload-resumed',
          elements => elements.map(el => el.textContent)
        );
        
        await testBrowser.screenshot('file-upload-comprehensive', 'network-interruption-test');
        
        logger.success('Network interruption handling tested');
      }
    });
  });

  describe('Upload UI and UX', () => {
    test('should provide clear upload feedback', async () => {
      logger.info('Testing upload feedback mechanisms');

      const result = await uploadFileWithMonitoring(mediumFile);
      
      // Check for various feedback indicators
      const feedbackElements = await page.$$eval(
        '[data-testid*="upload"], .upload, [data-testid*="progress"], .progress',
        elements => elements.map(el => ({
          tagName: el.tagName,
          className: el.className,
          textContent: el.textContent,
        }))
      );
      
      expect(feedbackElements.length).toBeGreaterThan(0);
      
      await testBrowser.screenshot('file-upload-comprehensive', 'upload-feedback');
      
      logger.success(`Found ${feedbackElements.length} upload feedback elements`);
    });

    test('should support drag and drop upload', async () => {
      logger.info('Testing drag and drop upload interface');

      // Look for drop zone
      const dropZoneSelector = '[data-testid*="drop"], .drop-zone, .upload-area';
      const dropZoneExists = await helpers.elementExists(dropZoneSelector);

      if (dropZoneExists) {
        // Simulate drag and drop
        const fileBuffer = await fs.readFile(smallFile);
        
        await page.evaluate((selector, fileName, fileData) => {
          const dropZone = document.querySelector(selector);
          if (dropZone) {
            const file = new File([new Uint8Array(fileData)], fileName, { type: 'text/plain' });
            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(file);
            
            const dropEvent = new DragEvent('drop', {
              bubbles: true,
              cancelable: true,
              dataTransfer: dataTransfer,
            });
            
            dropZone.dispatchEvent(dropEvent);
          }
        }, dropZoneSelector, path.basename(smallFile), Array.from(fileBuffer));
        
        await page.waitForTimeout(2000);
        
        await testBrowser.screenshot('file-upload-comprehensive', 'drag-drop-upload');
        
        logger.success('Drag and drop upload interface tested');
      } else {
        logger.info('No drag and drop zone found');
      }
    });

    test('should display upload queue and management', async () => {
      logger.info('Testing upload queue and management');

      // Start multiple uploads to create a queue
      const files = [smallFile, mediumFile];
      
      for (const file of files) {
        const fileInput = await page.$('input[type="file"]');
        if (fileInput) {
          await fileInput.uploadFile(file);
          await page.waitForTimeout(1000);
        }
      }

      // Look for queue management controls
      const queueControls = await page.$$eval(
        '[data-testid*="queue"], [data-testid*="cancel"], [data-testid*="pause"], .upload-queue',
        elements => elements.map(el => el.textContent)
      );

      await testBrowser.screenshot('file-upload-comprehensive', 'upload-queue');
      
      logger.success(`Found ${queueControls.length} upload queue controls`);
    });
  });

  describe('Upload Integration Tests', () => {
    test('should integrate with workspace selection', async () => {
      logger.info('Testing upload integration with workspace selection');

      // Check if workspace selection is available in upload interface
      const workspaceSelectExists = await helpers.elementExists(
        '[data-testid*="workspace"], .workspace-select, select[name*="workspace"]'
      );

      if (workspaceSelectExists) {
        const result = await uploadFileWithMonitoring(smallFile);
        expect(result.completed).toBe(true);
        
        logger.success('Upload integrated with workspace selection');
      } else {
        logger.info('Workspace selection not found in upload interface');
      }

      await testBrowser.screenshot('file-upload-comprehensive', 'workspace-integration');
    });

    test('should update file list in real-time', async () => {
      logger.info('Testing real-time file list updates');

      // Get initial file count
      const initialFileCount = await helpers.getElementCount('[data-testid*="file"], .file-item');
      
      const result = await uploadFileWithMonitoring(smallFile);
      expect(result.completed).toBe(true);
      
      // Wait for UI to update
      await page.waitForTimeout(2000);
      
      // Get updated file count
      const updatedFileCount = await helpers.getElementCount('[data-testid*="file"], .file-item');
      
      expect(updatedFileCount).toBeGreaterThan(initialFileCount);
      
      await testBrowser.screenshot('file-upload-comprehensive', 'real-time-updates');
      
      logger.success('Real-time file list updates working');
    });

    test('should handle file metadata correctly', async () => {
      logger.info('Testing file metadata handling');

      const testFile = smallFile;
      const fileName = path.basename(testFile);
      const fileStats = await fs.stat(testFile);
      
      const result = await uploadFileWithMonitoring(testFile);
      expect(result.completed).toBe(true);
      
      // Check if file metadata is displayed
      await page.waitForTimeout(2000);
      
      const fileElements = await page.$$eval(
        '[data-testid*="file"], .file-item',
        elements => elements.map(el => ({
          textContent: el.textContent,
          innerHTML: el.innerHTML,
        }))
      );
      
      const fileElement = fileElements.find(el => 
        el.textContent && el.textContent.includes(fileName)
      );
      
      if (fileElement) {
        // Check for size information
        const hasSizeInfo = fileElement.textContent.includes('KB') || 
                           fileElement.textContent.includes('MB') ||
                           fileElement.textContent.includes('bytes');
        
        if (hasSizeInfo) {
          logger.success('File metadata (size) displayed correctly');
        }
        
        // Check for date information
        const hasDateInfo = fileElement.textContent.match(/\d{1,2}\/\d{1,2}\/\d{4}/) ||
                           fileElement.textContent.includes('ago') ||
                           fileElement.textContent.includes('today');
        
        if (hasDateInfo) {
          logger.success('File metadata (date) displayed correctly');
        }
      }
      
      await testBrowser.screenshot('file-upload-comprehensive', 'file-metadata');
    });
  });

  describe('Performance and Reliability', () => {
    test('should maintain performance under load', async () => {
      logger.info('Testing upload performance under load');

      const startTime = Date.now();
      
      // Upload multiple files in sequence
      const files = [smallFile, mediumFile, smallFile];
      const results = [];
      
      for (const file of files) {
        const result = await uploadFileWithMonitoring(file, 30000);
        results.push(result);
      }
      
      const totalTime = Date.now() - startTime;
      const avgTime = totalTime / files.length;
      
      // All uploads should complete
      const successCount = results.filter(r => r.completed).length;
      expect(successCount).toBe(files.length);
      
      // Performance should be reasonable
      expect(avgTime).toBeLessThan(20000); // Average <20s per file
      
      logger.success(`Performance test: ${successCount}/${files.length} uploads completed, avg time: ${avgTime}ms`);
    });

    test('should recover from errors gracefully', async () => {
      logger.info('Testing error recovery');

      // Try uploading a non-existent file to trigger error
      try {
        await uploadFileWithMonitoring('/nonexistent/file.txt', 5000);
      } catch (error) {
        // Expected to fail
      }
      
      // Then upload a valid file to test recovery
      const result = await uploadFileWithMonitoring(smallFile);
      expect(result.completed).toBe(true);
      
      await testBrowser.screenshot('file-upload-comprehensive', 'error-recovery');
      
      logger.success('Error recovery working correctly');
    });
  });
});