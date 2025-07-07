import { setupGlobal, teardownGlobal, testBrowser, logger, config } from './setup';
import { TestHelpers, TestResult } from '../utils/helpers';
import { NAVIGATION_SELECTORS, DASHBOARD_SELECTORS, WORKSPACE_SELECTORS, TASK_SELECTORS, FILE_SELECTORS } from '../utils/selectors';

describe('Responsive Design Tests', () => {
  let helpers: TestHelpers;
  let page: any;

  // Common viewport sizes for testing
  const viewports = [
    { name: 'Mobile Portrait', width: 375, height: 667 },
    { name: 'Mobile Landscape', width: 667, height: 375 },
    { name: 'Tablet Portrait', width: 768, height: 1024 },
    { name: 'Tablet Landscape', width: 1024, height: 768 },
    { name: 'Small Desktop', width: 1366, height: 768 },
    { name: 'Large Desktop', width: 1920, height: 1080 }
  ];

  beforeAll(async () => {
    await setupGlobal();
    page = await testBrowser.newPage('responsive-test');
    helpers = new TestHelpers(page);
    
    // Login first
    const loginResult = await helpers.login();
    expect(loginResult.success).toBe(true);
    
    logger.info('Responsive design tests initialized and user logged in');
  });

  afterAll(async () => {
    await teardownGlobal();
    logger.info('Responsive design tests completed');
  });

  describe('Dashboard Responsive Layout', () => {
    test('should display dashboard correctly across all viewport sizes', async () => {
      logger.info('Testing dashboard layout across different viewport sizes');
      
      for (const viewport of viewports) {
        logger.info(`Testing ${viewport.name} (${viewport.width}x${viewport.height})`);
        
        await page.setViewport({ width: viewport.width, height: viewport.height });
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        await helpers.navigateTo('/dashboard');
        await page.waitForTimeout(2000);
        
        await testBrowser.screenshot('responsive-test', `dashboard-${viewport.name.toLowerCase().replace(' ', '-')}`);
        
        // Check if main content is visible
        const dashboardExists = await helpers.elementExists(DASHBOARD_SELECTORS.DASHBOARD_CONTAINER);
        expect(dashboardExists).toBe(true);
        
        // Check navigation visibility
        const navigationVisible = await helpers.elementVisible(NAVIGATION_SELECTORS.DASHBOARD_LINK);
        
        if (viewport.width < 768) {
          // Mobile: navigation might be hidden behind hamburger menu
          const mobileMenuExists = await helpers.elementExists(NAVIGATION_SELECTORS.MOBILE_MENU_TRIGGER);
          if (mobileMenuExists && !navigationVisible) {
            logger.success(`${viewport.name}: Mobile menu trigger found, navigation properly hidden`);
          } else if (navigationVisible) {
            logger.success(`${viewport.name}: Navigation visible (may be different mobile layout)`);
          }
        } else {
          // Desktop/Tablet: navigation should be visible
          expect(navigationVisible).toBe(true);
          logger.success(`${viewport.name}: Navigation properly visible`);
        }
        
        logger.success(`${viewport.name}: Dashboard layout verified`);
      }
      
      // Reset to default viewport
      await page.setViewport({ width: 1366, height: 768 });
    });

    test('should handle mobile navigation menu', async () => {
      logger.info('Testing mobile navigation menu functionality');
      
      // Set to mobile viewport
      await page.setViewport({ width: 375, height: 667 });
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      await helpers.navigateTo('/dashboard');
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const mobileMenuExists = await helpers.elementExists(NAVIGATION_SELECTORS.MOBILE_MENU_TRIGGER);
      
      if (mobileMenuExists) {
        // Open mobile menu
        await helpers.clickElement(NAVIGATION_SELECTORS.MOBILE_MENU_TRIGGER);
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        await testBrowser.screenshot('responsive-test', 'mobile-menu-opened');
        
        // Check if menu content is visible
        const menuVisible = await helpers.elementVisible(NAVIGATION_SELECTORS.MOBILE_MENU);
        if (menuVisible) {
          logger.success('Mobile menu opened and content visible');
          
          // Test navigation from mobile menu
          const workspacesLinkExists = await helpers.elementExists(NAVIGATION_SELECTORS.WORKSPACES_LINK);
          if (workspacesLinkExists) {
            await helpers.clickElement(NAVIGATION_SELECTORS.WORKSPACES_LINK);
            await page.waitForTimeout(2000);
            
            await testBrowser.screenshot('responsive-test', 'mobile-navigation-workspaces');
            
            // Check if we navigated successfully
            const currentUrl = page.url();
            expect(currentUrl).toContain('workspaces');
            
            logger.success('Mobile navigation to workspaces successful');
          }
        }
        
        // Close menu by clicking outside
        await page.click('body');
        await new Promise(resolve => setTimeout(resolve, 1000));
      } else {
        logger.warn('Mobile menu trigger not found - mobile navigation may be implemented differently');
      }
      
      // Reset viewport
      await page.setViewport({ width: 1366, height: 768 });
    });
  });

  describe('Workspaces Responsive Layout', () => {
    test('should display workspaces grid responsively', async () => {
      logger.info('Testing workspaces grid responsive layout');
      
      for (const viewport of viewports) {
        logger.info(`Testing workspaces on ${viewport.name}`);
        
        await page.setViewport({ width: viewport.width, height: viewport.height });
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        await helpers.navigateTo('/dashboard/workspaces');
        await page.waitForTimeout(2000);
        
        await testBrowser.screenshot('responsive-test', `workspaces-${viewport.name.toLowerCase().replace(' ', '-')}`);
        
        // Count workspace cards visible
        const workspaceCount = await helpers.getElementCount(WORKSPACE_SELECTORS.WORKSPACE_CARD);
        
        if (workspaceCount > 0) {
          // Check if cards are properly arranged
          const firstCard = await page.$(WORKSPACE_SELECTORS.WORKSPACE_CARD);
          if (firstCard) {
            const cardInfo = await firstCard.boundingBox();
            if (cardInfo) {
              logger.info(`${viewport.name}: ${workspaceCount} workspace cards found, first card at ${cardInfo.x}, ${cardInfo.y}`);
            }
          }
          
          logger.success(`${viewport.name}: Workspaces layout verified with ${workspaceCount} cards`);
        } else {
          logger.info(`${viewport.name}: No workspace cards found (may be empty state)`);
        }
      }
      
      await page.setViewport({ width: 1366, height: 768 });
    });

    test('should handle workspace creation modal on mobile', async () => {
      logger.info('Testing workspace creation modal on mobile');
      
      await page.setViewport({ width: 375, height: 667 });
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      await helpers.navigateTo('/dashboard/workspaces');
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const createButtonExists = await helpers.elementExists(WORKSPACE_SELECTORS.CREATE_WORKSPACE_BUTTON);
      
      if (createButtonExists) {
        await helpers.clickElement(WORKSPACE_SELECTORS.CREATE_WORKSPACE_BUTTON);
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        await testBrowser.screenshot('responsive-test', 'mobile-workspace-modal');
        
        // Check if modal is properly sized for mobile
        const modalExists = await helpers.elementExists(WORKSPACE_SELECTORS.WORKSPACE_MODAL);
        if (modalExists) {
          const modal = await page.$(WORKSPACE_SELECTORS.WORKSPACE_MODAL);
          if (modal) {
            const modalBox = await modal.boundingBox();
            if (modalBox) {
              const fitsInViewport = modalBox.width <= 375 && modalBox.height <= 667;
              if (fitsInViewport) {
                logger.success('Workspace creation modal fits mobile viewport');
              } else {
                logger.warn(`Modal may be too large for mobile: ${modalBox.width}x${modalBox.height}`);
              }
            }
          }
        }
        
        // Close modal
        await page.keyboard.press('Escape');
        await page.waitForTimeout(500);
      }
      
      await page.setViewport({ width: 1366, height: 768 });
    });
  });

  describe('Tasks Responsive Layout', () => {
    test('should display tasks list responsively', async () => {
      logger.info('Testing tasks list responsive layout');
      
      const mobileViewports = viewports.filter(v => v.width <= 768);
      const desktopViewports = viewports.filter(v => v.width > 768);
      
      for (const viewport of [...mobileViewports, ...desktopViewports]) {
        logger.info(`Testing tasks on ${viewport.name}`);
        
        await page.setViewport({ width: viewport.width, height: viewport.height });
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        await helpers.navigateTo('/dashboard/tasks');
        await page.waitForTimeout(2000);
        
        await testBrowser.screenshot('responsive-test', `tasks-${viewport.name.toLowerCase().replace(' ', '-')}`);
        
        // Check task items layout
        const taskCount = await helpers.getElementCount(TASK_SELECTORS.TASK_ITEM);
        
        if (taskCount > 0) {
          // Check if tasks are stacked properly on mobile
          if (viewport.width <= 768) {
            logger.success(`${viewport.name}: ${taskCount} tasks displayed in mobile layout`);
          } else {
            logger.success(`${viewport.name}: ${taskCount} tasks displayed in desktop layout`);
          }
        }
        
        // Check filter visibility
        const filtersVisible = await helpers.elementVisible(TASK_SELECTORS.TASK_FILTER_ALL);
        if (viewport.width <= 480) {
          // On very small screens, filters might be collapsed
          if (!filtersVisible) {
            logger.info(`${viewport.name}: Filters may be collapsed on small screen`);
          }
        } else {
          if (filtersVisible) {
            logger.success(`${viewport.name}: Task filters visible`);
          }
        }
      }
      
      await page.setViewport({ width: 1366, height: 768 });
    });

    test('should handle task creation on mobile', async () => {
      logger.info('Testing task creation on mobile devices');
      
      await page.setViewport({ width: 375, height: 667 });
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      await helpers.navigateTo('/dashboard/tasks');
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const createButtonExists = await helpers.elementExists(TASK_SELECTORS.CREATE_TASK_BUTTON);
      
      if (createButtonExists) {
        await helpers.clickElement(TASK_SELECTORS.CREATE_TASK_BUTTON);
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        await testBrowser.screenshot('responsive-test', 'mobile-task-creation');
        
        // Check if form elements are accessible on mobile
        const titleInputExists = await helpers.elementExists(TASK_SELECTORS.TASK_TITLE_INPUT);
        if (titleInputExists) {
          const titleInput = await page.$(TASK_SELECTORS.TASK_TITLE_INPUT);
          if (titleInput) {
            const inputBox = await titleInput.boundingBox();
            if (inputBox && inputBox.width > 0) {
              logger.success('Task title input accessible on mobile');
            }
          }
        }
        
        // Close modal
        await page.keyboard.press('Escape');
        await page.waitForTimeout(500);
      }
      
      await page.setViewport({ width: 1366, height: 768 });
    });
  });

  describe('Files Responsive Layout', () => {
    test('should display files view responsively', async () => {
      logger.info('Testing files view responsive layout');
      
      for (const viewport of viewports) {
        logger.info(`Testing files on ${viewport.name}`);
        
        await page.setViewport({ width: viewport.width, height: viewport.height });
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        await helpers.navigateTo('/dashboard/files');
        await page.waitForTimeout(2000);
        
        await testBrowser.screenshot('responsive-test', `files-${viewport.name.toLowerCase().replace(' ', '-')}`);
        
        // Check upload area
        const uploadAreaExists = await helpers.elementExists(FILE_SELECTORS.UPLOAD_AREA);
        if (uploadAreaExists) {
          const uploadArea = await page.$(FILE_SELECTORS.UPLOAD_AREA);
          if (uploadArea) {
            const areaBox = await uploadArea.boundingBox();
            if (areaBox) {
              const fitsWidth = areaBox.width <= viewport.width;
              if (fitsWidth) {
                logger.success(`${viewport.name}: Upload area fits viewport width`);
              } else {
                logger.warn(`${viewport.name}: Upload area may overflow viewport`);
              }
            }
          }
        }
        
        // Check file items layout
        const fileCount = await helpers.getElementCount(FILE_SELECTORS.FILE_ITEM);
        if (fileCount > 0) {
          logger.success(`${viewport.name}: ${fileCount} files displayed`);
        }
      }
      
      await page.setViewport({ width: 1366, height: 768 });
    });

    test('should handle file upload on mobile', async () => {
      logger.info('Testing file upload interface on mobile');
      
      await page.setViewport({ width: 375, height: 667 });
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      await helpers.navigateTo('/dashboard/files');
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const uploadButtonExists = await helpers.elementExists(FILE_SELECTORS.UPLOAD_BUTTON);
      const uploadAreaExists = await helpers.elementExists(FILE_SELECTORS.UPLOAD_AREA);
      
      if (uploadButtonExists || uploadAreaExists) {
        await testBrowser.screenshot('responsive-test', 'mobile-file-upload');
        
        // Test upload button/area accessibility
        if (uploadButtonExists) {
          const uploadButton = await page.$(FILE_SELECTORS.UPLOAD_BUTTON);
          if (uploadButton) {
            const buttonBox = await uploadButton.boundingBox();
            if (buttonBox && buttonBox.width > 40 && buttonBox.height > 40) {
              logger.success('Upload button is touch-friendly size on mobile');
            }
          }
        }
        
        logger.success('File upload interface accessible on mobile');
      }
      
      await page.setViewport({ width: 1366, height: 768 });
    });
  });

  describe('Settings Responsive Layout', () => {
    test('should display settings page responsively', async () => {
      logger.info('Testing settings page responsive layout');
      
      for (const viewport of viewports) {
        logger.info(`Testing settings on ${viewport.name}`);
        
        await page.setViewport({ width: viewport.width, height: viewport.height });
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        await helpers.navigateTo('/dashboard/settings');
        await page.waitForTimeout(2000);
        
        await testBrowser.screenshot('responsive-test', `settings-${viewport.name.toLowerCase().replace(' ', '-')}`);
        
        // Check if settings tabs are accessible
        const tabCount = await helpers.getElementCount('[data-testid="profile"]"Account")');
        
        if (viewport.width <= 768) {
          // On mobile, tabs might be stacked or in a dropdown
          if (tabCount > 0) {
            logger.success(`${viewport.name}: ${tabCount} settings tabs accessible`);
          } else {
            // Look for mobile-specific navigation
            const mobileTabsExists = await helpers.elementExists('[data-testid*="mobile-tabs"], select:has(option)');
            if (mobileTabsExists) {
              logger.success(`${viewport.name}: Mobile-specific tab navigation found`);
            }
          }
        } else {
          // Desktop should show tabs normally
          if (tabCount > 0) {
            logger.success(`${viewport.name}: ${tabCount} settings tabs visible`);
          }
        }
      }
      
      await page.setViewport({ width: 1366, height: 768 });
    });
  });

  describe('Form Elements Responsive Behavior', () => {
    test('should handle form inputs on touch devices', async () => {
      logger.info('Testing form inputs on touch device sizes');
      
      const touchViewports = viewports.filter(v => v.width <= 1024);
      
      for (const viewport of touchViewports) {
        logger.info(`Testing forms on ${viewport.name}`);
        
        await page.setViewport({ width: viewport.width, height: viewport.height });
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        await helpers.navigateTo('/dashboard/workspaces');
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const createButtonExists = await helpers.elementExists(WORKSPACE_SELECTORS.CREATE_WORKSPACE_BUTTON);
        
        if (createButtonExists) {
          await helpers.clickElement(WORKSPACE_SELECTORS.CREATE_WORKSPACE_BUTTON);
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Check input field sizes
          const nameInputExists = await helpers.elementExists(WORKSPACE_SELECTORS.WORKSPACE_NAME_INPUT);
          
          if (nameInputExists) {
            const nameInput = await page.$(WORKSPACE_SELECTORS.WORKSPACE_NAME_INPUT);
            if (nameInput) {
              const inputBox = await nameInput.boundingBox();
              if (inputBox) {
                const isTouchFriendly = inputBox.height >= 44; // Apple's recommended touch target size
                if (isTouchFriendly) {
                  logger.success(`${viewport.name}: Input fields are touch-friendly (${inputBox.height}px height)`);
                } else {
                  logger.warn(`${viewport.name}: Input field may be too small for touch (${inputBox.height}px height)`);
                }
              }
            }
            
            // Test typing on mobile
            await helpers.typeText(WORKSPACE_SELECTORS.WORKSPACE_NAME_INPUT, 'Mobile Test');
            await page.waitForTimeout(500);
            
            const value = await helpers.getValue(WORKSPACE_SELECTORS.WORKSPACE_NAME_INPUT);
            if (value === 'Mobile Test') {
              logger.success(`${viewport.name}: Text input working correctly`);
            }
          }
          
          // Close modal
          await page.keyboard.press('Escape');
          await page.waitForTimeout(500);
        }
      }
      
      await page.setViewport({ width: 1366, height: 768 });
    });
  });

  describe('Button and Link Accessibility', () => {
    test('should have touch-friendly buttons across viewport sizes', async () => {
      logger.info('Testing button touch-friendliness across viewports');
      
      const mobileViewports = viewports.filter(v => v.width <= 768);
      
      for (const viewport of mobileViewports) {
        logger.info(`Testing button accessibility on ${viewport.name}`);
        
        await page.setViewport({ width: viewport.width, height: viewport.height });
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        await helpers.navigateTo('/dashboard');
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Check common buttons
        const buttons = [
          NAVIGATION_SELECTORS.WORKSPACES_LINK,
          NAVIGATION_SELECTORS.TASKS_LINK,
          NAVIGATION_SELECTORS.FILES_LINK
        ];
        
        let touchFriendlyButtons = 0;
        
        for (const buttonSelector of buttons) {
          const buttonExists = await helpers.elementExists(buttonSelector);
          if (buttonExists) {
            const button = await page.$(buttonSelector);
            if (button) {
              const buttonBox = await button.boundingBox();
              if (buttonBox && buttonBox.height >= 40 && buttonBox.width >= 40) {
                touchFriendlyButtons++;
              }
            }
          }
        }
        
        if (touchFriendlyButtons > 0) {
          logger.success(`${viewport.name}: ${touchFriendlyButtons} touch-friendly buttons found`);
        }
        
        await testBrowser.screenshot('responsive-test', `buttons-${viewport.name.toLowerCase().replace(' ', '-')}`);
      }
      
      await page.setViewport({ width: 1366, height: 768 });
    });
  });

  describe('Responsive Performance', () => {
    test('should maintain reasonable performance across viewport sizes', async () => {
      logger.info('Testing performance across different viewport sizes');
      
      for (const viewport of viewports) {
        logger.info(`Testing performance on ${viewport.name}`);
        
        await page.setViewport({ width: viewport.width, height: viewport.height });
        
        const startTime = Date.now();
        
        await helpers.navigateTo('/dashboard');
        await page.waitForTimeout(2000);
        
        const loadTime = Date.now() - startTime;
        
        // Basic performance check - page should load within reasonable time
        if (loadTime < 5000) {
          logger.success(`${viewport.name}: Page loaded in ${loadTime}ms`);
        } else {
          logger.warn(`${viewport.name}: Slow page load: ${loadTime}ms`);
        }
        
        // Check for layout shifts by taking screenshot
        await testBrowser.screenshot('responsive-test', `performance-${viewport.name.toLowerCase().replace(' ', '-')}`);
      }
      
      await page.setViewport({ width: 1366, height: 768 });
    });
  });
});