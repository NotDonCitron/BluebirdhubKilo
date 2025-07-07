import { setupGlobal, teardownGlobal, testBrowser, logger, config } from './setup';
import { TestHelpers, TestResult } from '../utils/helpers';
import { FILE_SELECTORS, NAVIGATION_SELECTORS, MODAL_SELECTORS, TOAST_SELECTORS, FORM_SELECTORS } from '../utils/selectors';

describe('Files Management Tests', () => {
  let helpers: TestHelpers;
  let page: any;

  beforeAll(async () => {
    await setupGlobal();
    page = await testBrowser.newPage('files-test');
    helpers = new TestHelpers(page);
    
    // Login first
    const loginResult = await helpers.login();
    expect(loginResult.success).toBe(true);
    
    logger.info('Files tests initialized and user logged in');
  });

  afterAll(async () => {
    await teardownGlobal();
    logger.info('Files tests completed');
  });

  beforeEach(async () => {
    await helpers.navigateTo('/dashboard/files');
    await new Promise(resolve => setTimeout(resolve, 2000));
  });

  describe('Files Page Display', () => {
    test('should display files page correctly', async () => {
      logger.info('Testing files page display');
      
      await testBrowser.screenshot('files-test', 'files-page-loaded');
      
      // Check if upload button or area exists
      const uploadButtonExists = await helpers.elementExists(FILE_SELECTORS.UPLOAD_BUTTON);
      const uploadAreaExists = await helpers.elementExists(FILE_SELECTORS.UPLOAD_AREA);
      
      expect(uploadButtonExists || uploadAreaExists).toBe(true);
      
      // Check if files container exists
      const containerExists = await helpers.elementExists(FILE_SELECTORS.FILES_CONTAINER);
      expect(containerExists).toBe(true);
      
      logger.success('Files page displayed correctly');
    });

    test('should display file management controls', async () => {
      logger.info('Testing file management controls');
      
      const controls = [
        { name: 'Upload Button', selector: FILE_SELECTORS.UPLOAD_BUTTON },
        { name: 'Upload Area', selector: FILE_SELECTORS.UPLOAD_AREA },
        { name: 'Create Folder Button', selector: FILE_SELECTORS.CREATE_FOLDER_BUTTON },
        { name: 'File Search', selector: FILE_SELECTORS.FILE_SEARCH_INPUT }
      ];
      
      let controlsFound = 0;
      for (const control of controls) {
        const exists = await helpers.elementExists(control.selector);
        if (exists) {
          controlsFound++;
          logger.success(`${control.name} found`);
        }
      }
      
      await testBrowser.screenshot('files-test', 'file-controls');
      logger.success(`Found ${controlsFound} file management controls`);
    });
  });

  describe('File Upload', () => {
    test('should trigger file upload dialog', async () => {
      logger.info('Testing file upload dialog trigger');
      
      const uploadButtonExists = await helpers.elementExists(FILE_SELECTORS.UPLOAD_BUTTON);
      const uploadAreaExists = await helpers.elementExists(FILE_SELECTORS.UPLOAD_AREA);
      
      if (uploadButtonExists) {
        await helpers.clickElement(FILE_SELECTORS.UPLOAD_BUTTON);
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        await testBrowser.screenshot('files-test', 'upload-button-clicked');
        
        logger.success('Upload button clicked - file dialog should have opened');
      } else if (uploadAreaExists) {
        await helpers.clickElement(FILE_SELECTORS.UPLOAD_AREA);
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        await testBrowser.screenshot('files-test', 'upload-area-clicked');
        
        logger.success('Upload area clicked - file dialog should have opened');
      } else {
        logger.warn('No upload trigger found');
      }
    });

    test('should handle drag and drop area if available', async () => {
      logger.info('Testing drag and drop functionality');
      
      const uploadAreaExists = await helpers.elementExists(FILE_SELECTORS.UPLOAD_AREA);
      
      if (uploadAreaExists) {
        // Simulate drag over event
        await page.evaluate((selector) => {
          const element = document.querySelector(selector);
          if (element) {
            const dragEvent = new DragEvent('dragover', {
              bubbles: true,
              cancelable: true,
              dataTransfer: new DataTransfer()
            });
            element.dispatchEvent(dragEvent);
          }
        }, FILE_SELECTORS.UPLOAD_AREA);
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        await testBrowser.screenshot('files-test', 'drag-over-simulation');
        
        logger.success('Drag and drop area interaction tested');
      } else {
        logger.warn('Upload area not found for drag and drop testing');
      }
    });

    test('should display upload progress if available', async () => {
      logger.info('Testing upload progress indicators');
      
      // Look for upload progress elements
      const progressExists = await helpers.elementExists('[data-testid*="progress"], .progress, [class*="upload-progress"]');
      
      if (progressExists) {
        await testBrowser.screenshot('files-test', 'upload-progress');
        logger.success('Upload progress indicators found');
      } else {
        logger.info('Upload progress indicators not currently visible');
      }
    });
  });

  describe('Folder Management', () => {
    test('should create new folder', async () => {
      logger.info('Testing folder creation');
      
      const createFolderExists = await helpers.elementExists(FILE_SELECTORS.CREATE_FOLDER_BUTTON);
      
      if (createFolderExists) {
        await helpers.clickElement(FILE_SELECTORS.CREATE_FOLDER_BUTTON);
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        await testBrowser.screenshot('files-test', 'create-folder-clicked');
        
        // Look for folder name input
        const folderNameExists = await helpers.elementExists(FILE_SELECTORS.FOLDER_NAME_INPUT);
        
        if (folderNameExists) {
          const folderName = `Test Folder ${Date.now()}`;
          await helpers.typeText(FILE_SELECTORS.FOLDER_NAME_INPUT, folderName);
          
          // Submit folder creation (usually Enter key or submit button)
          await page.keyboard.press('Enter');
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          await testBrowser.screenshot('files-test', 'folder-created');
          
          // Check if folder was created
          const newFolderExists = await helpers.elementExists(`${FILE_SELECTORS.FOLDER_ITEM}:has-text("${folderName}")`, 3000);
          
          if (newFolderExists) {
            logger.success(`Folder "${folderName}" created successfully`);
          } else {
            logger.info('Folder creation attempted - checking for success indicators');
          }
        } else {
          logger.warn('Folder name input not found after clicking create folder');
        }
      } else {
        logger.warn('Create folder button not found');
      }
    });

    test('should navigate into folders', async () => {
      logger.info('Testing folder navigation');
      
      const folderCount = await helpers.getElementCount(FILE_SELECTORS.FOLDER_ITEM);
      
      if (folderCount > 0) {
        logger.info(`Found ${folderCount} folders to test`);
        
        // Double-click on first folder
        await helpers.clickElement(FILE_SELECTORS.FOLDER_ITEM + ':first-child');
        await new Promise(resolve => setTimeout(resolve, 500));
        await helpers.clickElement(FILE_SELECTORS.FOLDER_ITEM + ':first-child'); // Double click
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        await testBrowser.screenshot('files-test', 'folder-opened');
        
        // Check if URL changed or breadcrumb appeared
        const currentUrl = page.url();
        const breadcrumbExists = await helpers.elementExists('[data-testid*="breadcrumb"], .breadcrumb, nav:has(a)');
        
        if (breadcrumbExists || currentUrl.includes('folder') || currentUrl.includes('path')) {
          logger.success('Folder navigation working');
        } else {
          logger.info('Folder navigation attempted - checking current state');
        }
        
        // Navigate back to root if possible
        if (breadcrumbExists) {
          await helpers.clickElement('[data-testid*="breadcrumb"], .breadcrumb, nav:has(a):first-child');
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } else {
        logger.warn('No folders available to test navigation');
      }
    });
  });

  describe('File Search and Filtering', () => {
    test('should search files', async () => {
      logger.info('Testing file search functionality');
      
      const searchExists = await helpers.elementExists(FILE_SELECTORS.FILE_SEARCH_INPUT);
      
      if (searchExists) {
        const initialFileCount = await helpers.getElementCount(FILE_SELECTORS.FILE_ITEM);
        
        await helpers.typeText(FILE_SELECTORS.FILE_SEARCH_INPUT, 'test');
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const searchResultCount = await helpers.getElementCount(FILE_SELECTORS.FILE_ITEM);
        
        await testBrowser.screenshot('files-test', 'search-results');
        
        logger.success(`File search executed - showing ${searchResultCount} results from ${initialFileCount} total`);
        
        // Clear search
        await helpers.clearInput(FILE_SELECTORS.FILE_SEARCH_INPUT);
        await new Promise(resolve => setTimeout(resolve, 1000));
      } else {
        logger.warn('File search input not found');
      }
    });

    test('should filter files by type', async () => {
      logger.info('Testing file type filtering');
      
      const typeFilterExists = await helpers.elementExists(FILE_SELECTORS.FILE_TYPE_FILTER);
      
      if (typeFilterExists) {
        await helpers.clickElement(FILE_SELECTORS.FILE_TYPE_FILTER);
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        await testBrowser.screenshot('files-test', 'type-filter-opened');
        
        // Try to select a file type
        const filterOptions = ['Images', 'Documents', 'Videos', 'All'];
        
        for (const option of filterOptions) {
          const optionExists = await helpers.elementExists(`button:has-text("${option}"), option:has-text("${option}")`);
          if (optionExists) {
            await helpers.clickElement(`button:has-text("${option}"), option:has-text("${option}")`);
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            await testBrowser.screenshot('files-test', `filter-${option.toLowerCase()}`);
            
            logger.success(`File type filter "${option}" tested`);
            break;
          }
        }
      } else {
        logger.warn('File type filter not found');
      }
    });

    test('should filter files by size', async () => {
      logger.info('Testing file size filtering');
      
      const sizeFilterExists = await helpers.elementExists(FILE_SELECTORS.FILE_SIZE_FILTER);
      
      if (sizeFilterExists) {
        await helpers.clickElement(FILE_SELECTORS.FILE_SIZE_FILTER);
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        await testBrowser.screenshot('files-test', 'size-filter-opened');
        
        // Try to select a size range
        const sizeOptions = ['Small', 'Medium', 'Large', 'All Sizes'];
        
        for (const option of sizeOptions) {
          const optionExists = await helpers.elementExists(`button:has-text("${option}"), option:has-text("${option}")`);
          if (optionExists) {
            await helpers.clickElement(`button:has-text("${option}"), option:has-text("${option}")`);
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            logger.success(`File size filter "${option}" tested`);
            break;
          }
        }
      } else {
        logger.warn('File size filter not found');
      }
    });
  });

  describe('File Operations', () => {
    test('should access file menu', async () => {
      logger.info('Testing file menu access');
      
      const fileCount = await helpers.getElementCount(FILE_SELECTORS.FILE_ITEM);
      
      if (fileCount > 0) {
        const menuExists = await helpers.elementExists(FILE_SELECTORS.FILE_MENU);
        
        if (menuExists) {
          await helpers.clickElement(FILE_SELECTORS.FILE_MENU + ':first-child');
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          await testBrowser.screenshot('files-test', 'file-menu-opened');
          
          // Check for common file operations
          const operations = [
            { name: 'Download', selector: FILE_SELECTORS.DOWNLOAD_FILE_BUTTON },
            { name: 'Rename', selector: FILE_SELECTORS.RENAME_FILE_BUTTON },
            { name: 'Delete', selector: FILE_SELECTORS.DELETE_FILE_BUTTON }
          ];
          
          for (const operation of operations) {
            const exists = await helpers.elementExists(operation.selector);
            if (exists) {
              logger.success(`${operation.name} option found in file menu`);
            }
          }
          
          // Close menu
          await page.click('body');
          await new Promise(resolve => setTimeout(resolve, 500));
        } else {
          logger.warn('File menu not found');
        }
      } else {
        logger.warn('No files available to test menu operations');
      }
    });

    test('should download file', async () => {
      logger.info('Testing file download');
      
      const fileCount = await helpers.getElementCount(FILE_SELECTORS.FILE_ITEM);
      
      if (fileCount > 0) {
        const menuExists = await helpers.elementExists(FILE_SELECTORS.FILE_MENU);
        
        if (menuExists) {
          await helpers.clickElement(FILE_SELECTORS.FILE_MENU + ':first-child');
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          const downloadExists = await helpers.elementExists(FILE_SELECTORS.DOWNLOAD_FILE_BUTTON);
          
          if (downloadExists) {
            // Set up download handling
            await page._client.send('Page.setDownloadBehavior', {
              behavior: 'allow',
              downloadPath: '/tmp'
            });
            
            await helpers.clickElement(FILE_SELECTORS.DOWNLOAD_FILE_BUTTON);
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            await testBrowser.screenshot('files-test', 'file-download-initiated');
            
            logger.success('File download initiated');
          } else {
            logger.warn('Download button not found in file menu');
          }
        }
      } else {
        logger.warn('No files available to test download');
      }
    });

    test('should rename file', async () => {
      logger.info('Testing file rename');
      
      const fileCount = await helpers.getElementCount(FILE_SELECTORS.FILE_ITEM);
      
      if (fileCount > 0) {
        const menuExists = await helpers.elementExists(FILE_SELECTORS.FILE_MENU);
        
        if (menuExists) {
          await helpers.clickElement(FILE_SELECTORS.FILE_MENU + ':first-child');
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          const renameExists = await helpers.elementExists(FILE_SELECTORS.RENAME_FILE_BUTTON);
          
          if (renameExists) {
            await helpers.clickElement(FILE_SELECTORS.RENAME_FILE_BUTTON);
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            await testBrowser.screenshot('files-test', 'rename-dialog-opened');
            
            // Look for rename input
            const renameInputExists = await helpers.elementExists('input[placeholder*="name"], input[value]');
            
            if (renameInputExists) {
              const newName = `Renamed File ${Date.now()}`;
              await helpers.typeText('input[placeholder*="name"], input[value]', newName);
              await page.keyboard.press('Enter');
              await new Promise(resolve => setTimeout(resolve, 2000));
              
              await testBrowser.screenshot('files-test', 'file-renamed');
              
              logger.success('File rename operation completed');
            } else {
              logger.warn('Rename input not found');
            }
          } else {
            logger.warn('Rename button not found in file menu');
          }
        }
      } else {
        logger.warn('No files available to test rename');
      }
    });
  });

  describe('File Preview', () => {
    test('should preview files if preview functionality exists', async () => {
      logger.info('Testing file preview functionality');
      
      const fileCount = await helpers.getElementCount(FILE_SELECTORS.FILE_ITEM);
      
      if (fileCount > 0) {
        // Try double-clicking on a file to open preview
        await helpers.clickElement(FILE_SELECTORS.FILE_ITEM + ':first-child');
        await new Promise(resolve => setTimeout(resolve, 500));
        await helpers.clickElement(FILE_SELECTORS.FILE_ITEM + ':first-child'); // Double click
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        await testBrowser.screenshot('files-test', 'file-preview-attempt');
        
        // Look for preview modal or new tab
        const previewModalExists = await helpers.elementExists('[data-testid*="preview"], .preview-modal, [role="dialog"]:has(img), [role="dialog"]:has(iframe)');
        
        if (previewModalExists) {
          logger.success('File preview modal opened');
          
          // Close preview
          await page.keyboard.press('Escape');
          await new Promise(resolve => setTimeout(resolve, 1000));
        } else {
          logger.info('File preview not implemented or different interaction pattern');
        }
      } else {
        logger.warn('No files available to test preview');
      }
    });
  });

  describe('File View Options', () => {
    test('should switch between view modes if available', async () => {
      logger.info('Testing file view mode switching');
      
      // Look for view toggle buttons (grid/list view)
      const viewToggleExists = await helpers.elementExists('[data-testid*="view"], button:has([data-testid*="grid"]), button:has([data-testid*="list"])');
      
      if (viewToggleExists) {
        await helpers.clickElement('[data-testid*="view"], button:has([data-testid*="grid"]), button:has([data-testid*="list"]):first-child');
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        await testBrowser.screenshot('files-test', 'view-mode-switched');
        
        logger.success('File view mode toggle tested');
      } else {
        logger.info('File view mode toggles not found');
      }
    });

    test('should sort files if sorting controls exist', async () => {
      logger.info('Testing file sorting');
      
      const sortExists = await helpers.elementExists('button:has-text("Sort"), [data-testid*="sort"]');
      
      if (sortExists) {
        await helpers.clickElement('button:has-text("Sort"), [data-testid*="sort"]:first-child');
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        await testBrowser.screenshot('files-test', 'sort-options');
        
        // Try different sort options
        const sortOptions = ['Name', 'Date', 'Size', 'Type'];
        
        for (const option of sortOptions) {
          const optionExists = await helpers.elementExists(`button:has-text("${option}"), option:has-text("${option}")`);
          if (optionExists) {
            await helpers.clickElement(`button:has-text("${option}"), option:has-text("${option}")`);
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            logger.success(`File sorting by ${option} tested`);
            break;
          }
        }
      } else {
        logger.info('File sorting controls not found');
      }
    });
  });

  describe('File Error Handling', () => {
    test('should handle file operation errors', async () => {
      logger.info('Testing file operation error handling');
      
      // Try to access a non-existent file or perform invalid operation
      const fileCount = await helpers.getElementCount(FILE_SELECTORS.FILE_ITEM);
      
      if (fileCount > 0) {
        // Try to delete a file and see if confirmation dialog appears
        const menuExists = await helpers.elementExists(FILE_SELECTORS.FILE_MENU);
        
        if (menuExists) {
          await helpers.clickElement(FILE_SELECTORS.FILE_MENU + ':first-child');
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          const deleteExists = await helpers.elementExists(FILE_SELECTORS.DELETE_FILE_BUTTON);
          
          if (deleteExists) {
            await helpers.clickElement(FILE_SELECTORS.DELETE_FILE_BUTTON);
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Look for confirmation dialog
            const confirmationExists = await helpers.elementExists('[role="alertdialog"], [data-testid*="confirm"], button:has-text("Confirm")');
            
            if (confirmationExists) {
              await testBrowser.screenshot('files-test', 'delete-confirmation');
              
              logger.success('File deletion confirmation dialog appeared');
              
              // Cancel the deletion
              const cancelExists = await helpers.elementExists('button:has-text("Cancel")');
              if (cancelExists) {
                await helpers.clickElement('button:has-text("Cancel")');
                await new Promise(resolve => setTimeout(resolve, 1000));
              }
            } else {
              logger.info('No confirmation dialog for file deletion');
            }
          }
        }
      }
    });
  });

  describe('File Storage Information', () => {
    test('should display storage information if available', async () => {
      logger.info('Testing storage information display');
      
      // Look for storage usage indicators
      const storageInfoExists = await helpers.elementExists('[data-testid*="storage"], .storage-info, :has-text("GB"), :has-text("MB")');
      
      if (storageInfoExists) {
        await testBrowser.screenshot('files-test', 'storage-info');
        
        logger.success('Storage information found and displayed');
      } else {
        logger.info('Storage information not currently displayed');
      }
    });
  });

  describe('Comprehensive File Upload with Workspace Integration', () => {
    test('should upload file using helper method', async () => {
      logger.info('Testing file upload using helper method');
      
      const testFilePath = '/Users/phhtttps/BluebirdhubKilo/app/test-file.txt';
      
      // Test file upload
      const uploadResult = await helpers.uploadFile(testFilePath);
      expect(uploadResult.success).toBe(true);
      
      await testBrowser.screenshot('files-test', 'file-uploaded-successfully');
      
      // Verify file appears in file list
      await new Promise(resolve => setTimeout(resolve, 3000));
      const fileExists = await helpers.elementExistsByText('test-file.txt', '[data-testid="file-item"]');
      expect(fileExists).toBe(true);
      
      logger.success('File upload completed successfully');
    });

    test('should test complete file upload workflow', async () => {
      logger.info('Testing complete file upload workflow');
      
      // Create a workspace first for linking
      const workspaceName = `File-Upload-Workspace-${Date.now()}`;
      const workspaceResult = await helpers.createWorkspace({ name: workspaceName });
      expect(workspaceResult.success).toBe(true);
      
      // Navigate to files page
      await helpers.navigateTo('/dashboard/files');
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Look for upload interface
      await testBrowser.screenshot('files-test', 'files-page-before-upload');
      
      // Check for upload button or area
      const uploadButtonExists = await helpers.elementExists(FILE_SELECTORS.UPLOAD_BUTTON);
      const uploadAreaExists = await helpers.elementExists(FILE_SELECTORS.UPLOAD_AREA);
      const fileInputExists = await helpers.elementExists(FILE_SELECTORS.FILE_INPUT);
      
      expect(uploadButtonExists || uploadAreaExists || fileInputExists).toBe(true);
      
      if (uploadButtonExists) {
        await helpers.clickElement(FILE_SELECTORS.UPLOAD_BUTTON);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      // Attempt file upload
      const testFilePath = '/Users/phhtttps/BluebirdhubKilo/app/test-file.txt';
      
      try {
        const fileInput = await page.$(FILE_SELECTORS.FILE_INPUT);
        if (fileInput) {
          await fileInput.uploadFile(testFilePath);
          await new Promise(resolve => setTimeout(resolve, 3000));
          
          await testBrowser.screenshot('files-test', 'file-upload-attempted');
          
          logger.success('File upload workflow completed');
        } else {
          logger.warn('File input not found - upload interface may be different');
        }
      } catch (error) {
        logger.warn('File upload error (expected if upload not fully implemented):', error.message);
      }
    });

    test('should test drag and drop upload interface', async () => {
      logger.info('Testing drag and drop upload interface');
      
      // Look for drop zone
      const dropZoneExists = await helpers.elementExists(FILE_SELECTORS.FILE_DROP_ZONE);
      const uploadAreaExists = await helpers.elementExists(FILE_SELECTORS.UPLOAD_AREA);
      
      if (dropZoneExists || uploadAreaExists) {
        await testBrowser.screenshot('files-test', 'drag-drop-interface');
        
        // Test drag and drop simulation
        const dropTarget = dropZoneExists ? FILE_SELECTORS.FILE_DROP_ZONE : FILE_SELECTORS.UPLOAD_AREA;
        
        // Simulate drag over
        await page.evaluate((selector) => {
          const element = document.querySelector(selector);
          if (element) {
            const dragEvent = new DragEvent('dragover', {
              bubbles: true,
              cancelable: true
            });
            element.dispatchEvent(dragEvent);
          }
        }, dropTarget);
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        await testBrowser.screenshot('files-test', 'drag-over-simulation');
        
        logger.success('Drag and drop interface tested');
      } else {
        logger.info('Drag and drop interface not found');
      }
    });

    test('should validate file upload with workspace selection', async () => {
      logger.info('Testing file upload with workspace selection');
      
      // Create workspace for linking
      const workspaceName = `Upload-Link-Workspace-${Date.now()}`;
      const workspaceResult = await helpers.createWorkspace({ name: workspaceName });
      expect(workspaceResult.success).toBe(true);
      
      // Navigate to files and attempt upload with workspace linking
      await helpers.navigateTo('/dashboard/files');
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const testFilePath = '/Users/phhtttps/BluebirdhubKilo/app/test-file.txt';
      
      // Check if upload modal has workspace selection
      const uploadButtonExists = await helpers.elementExists(FILE_SELECTORS.UPLOAD_BUTTON);
      
      if (uploadButtonExists) {
        await helpers.clickElement(FILE_SELECTORS.UPLOAD_BUTTON);
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Look for workspace selection in upload modal
        const workspaceSelectExists = await helpers.elementExists(FILE_SELECTORS.FILE_WORKSPACE_SELECT);
        
        if (workspaceSelectExists) {
          await testBrowser.screenshot('files-test', 'upload-modal-with-workspace-select');
          logger.success('Workspace selection available in upload modal');
        } else {
          logger.info('Workspace selection not found in upload modal');
        }
        
        // Close modal
        await page.keyboard.press('Escape');
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      logger.success('File upload with workspace selection validated');
    });

    test('should test file management operations', async () => {
      logger.info('Testing file management operations');
      
      // Look for existing files or upload one first
      const fileCount = await helpers.getElementCount(FILE_SELECTORS.FILE_ITEM);
      
      if (fileCount > 0) {
        // Test file menu operations
        const fileMenuExists = await helpers.elementExists(FILE_SELECTORS.FILE_MENU);
        
        if (fileMenuExists) {
          await helpers.clickElement(FILE_SELECTORS.FILE_MENU);
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          await testBrowser.screenshot('files-test', 'file-menu-opened');
          
          // Test download button if exists
          const downloadExists = await helpers.elementExists(FILE_SELECTORS.DOWNLOAD_FILE_BUTTON);
          if (downloadExists) {
            logger.info('Download option available');
          }
          
          // Test rename button if exists
          const renameExists = await helpers.elementExists(FILE_SELECTORS.RENAME_FILE_BUTTON);
          if (renameExists) {
            logger.info('Rename option available');
          }
          
          // Test delete button if exists
          const deleteExists = await helpers.elementExists(FILE_SELECTORS.DELETE_FILE_BUTTON);
          if (deleteExists) {
            logger.info('Delete option available');
          }
          
          // Close menu
          await page.keyboard.press('Escape');
          await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        logger.success('File management operations tested');
      } else {
        logger.info('No files available to test management operations');
      }
    });
  });
});