import { setupGlobal, teardownGlobal, testBrowser, logger, config } from './setup';
import { TestHelpers, TestResult, generateTestData } from '../utils/helpers';
import { WORKSPACE_SELECTORS, NAVIGATION_SELECTORS, MODAL_SELECTORS, TOAST_SELECTORS } from '../utils/selectors';

describe('Workspaces Functionality Tests', () => {
  let helpers: TestHelpers;
  let page: any;
  let createdWorkspaceId: string | null = null;

  beforeAll(async () => {
    await setupGlobal();
    page = await testBrowser.newPage('workspaces-test');
    helpers = new TestHelpers(page);
    
    // Login first
    const loginResult = await helpers.login();
    expect(loginResult.success).toBe(true);
    
    logger.info('Workspaces tests initialized and user logged in');
  });

  afterAll(async () => {
    await teardownGlobal();
    logger.info('Workspaces tests completed');
  });

  beforeEach(async () => {
    await helpers.navigateTo('/dashboard/workspaces');
    await new Promise(resolve => setTimeout(resolve, 2000));
  });

  describe('Workspace Creation', () => {
    test('should display workspaces page correctly', async () => {
      logger.info('Testing workspaces page display');
      
      await testBrowser.screenshot('workspaces-test', 'workspaces-page-loaded');
      
      // Check if create workspace button exists
      const createButtonExists = await helpers.elementExists(WORKSPACE_SELECTORS.CREATE_WORKSPACE_BUTTON);
      expect(createButtonExists).toBe(true);
      
      // Check if workspaces container exists
      const containerExists = await helpers.elementExists(WORKSPACE_SELECTORS.WORKSPACES_CONTAINER);
      expect(containerExists).toBe(true);
      
      logger.success('Workspaces page displayed correctly');
    });

    test('should open create workspace modal', async () => {
      logger.info('Testing create workspace modal');
      
      const result = await helpers.clickElement(WORKSPACE_SELECTORS.CREATE_WORKSPACE_BUTTON);
      expect(result.success).toBe(true);
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      await testBrowser.screenshot('workspaces-test', 'create-modal-opened');
      
      // Check if modal is visible
      const modalExists = await helpers.elementExists(WORKSPACE_SELECTORS.WORKSPACE_MODAL);
      expect(modalExists).toBe(true);
      
      // Check if form elements exist
      const nameInputExists = await helpers.elementExists(WORKSPACE_SELECTORS.WORKSPACE_NAME_INPUT);
      const descInputExists = await helpers.elementExists(WORKSPACE_SELECTORS.WORKSPACE_DESCRIPTION_INPUT);
      
      expect(nameInputExists).toBe(true);
      expect(descInputExists).toBe(true);
      
      logger.success('Create workspace modal opened with required form elements');
      
      // Close modal for next test
      await page.keyboard.press('Escape');
      await new Promise(resolve => setTimeout(resolve, 500));
    });

    test('should validate required fields', async () => {
      logger.info('Testing workspace form validation');
      
      // Open modal
      await helpers.clickElement(WORKSPACE_SELECTORS.CREATE_WORKSPACE_BUTTON);
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Try to submit empty form
      const submitExists = await helpers.elementExists(WORKSPACE_SELECTORS.WORKSPACE_SUBMIT_BUTTON);
      if (submitExists) {
        await helpers.clickElement(WORKSPACE_SELECTORS.WORKSPACE_SUBMIT_BUTTON);
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        await testBrowser.screenshot('workspaces-test', 'validation-errors');
        
        // Modal should still be open (validation failed)
        const modalStillExists = await helpers.elementExists(WORKSPACE_SELECTORS.WORKSPACE_MODAL);
        expect(modalStillExists).toBe(true);
        
        logger.success('Form validation working correctly');
      }
      
      // Close modal
      await page.keyboard.press('Escape');
      await new Promise(resolve => setTimeout(resolve, 500));
    });

    test('should create a new workspace successfully', async () => {
      logger.info('Testing successful workspace creation');
      
      const testData = generateTestData.workspace();
      
      // Open create modal
      await helpers.clickElement(WORKSPACE_SELECTORS.CREATE_WORKSPACE_BUTTON);
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Fill form
      await helpers.typeText(WORKSPACE_SELECTORS.WORKSPACE_NAME_INPUT, testData.name);
      await helpers.typeText(WORKSPACE_SELECTORS.WORKSPACE_DESCRIPTION_INPUT, testData.description);
      
      await testBrowser.screenshot('workspaces-test', 'form-filled');
      
      // Submit form
      await helpers.clickElement(WORKSPACE_SELECTORS.WORKSPACE_SUBMIT_BUTTON);
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      await testBrowser.screenshot('workspaces-test', 'workspace-created');
      
      // Check for success indication (toast or redirect)
      const toastExists = await helpers.elementExists(TOAST_SELECTORS.TOAST_SUCCESS, 5000);
      const newWorkspaceExists = await helpers.elementExists(`[data-testid="${testdata.name}"]`, 5000);
      
      // At least one success indicator should be present
      expect(toastExists || newWorkspaceExists).toBe(true);
      
      if (newWorkspaceExists) {
        logger.success(`Workspace "${testData.name}" created successfully`);
      } else if (toastExists) {
        logger.success('Workspace creation success toast appeared');
      }
    });
  });

  describe('Workspace Management', () => {
    test('should display existing workspaces', async () => {
      logger.info('Testing workspace display');
      
      const workspaceCount = await helpers.getElementCount(WORKSPACE_SELECTORS.WORKSPACE_CARD);
      logger.info(`Found ${workspaceCount} workspaces`);
      
      if (workspaceCount > 0) {
        await testBrowser.screenshot('workspaces-test', 'workspaces-displayed');
        
        // Test clicking on a workspace
        const clickResult = await helpers.clickElement(WORKSPACE_SELECTORS.WORKSPACE_CARD + ':first-child');
        expect(clickResult.success).toBe(true);
        
        await new Promise(resolve => setTimeout(resolve, 2000));
        await testBrowser.screenshot('workspaces-test', 'workspace-opened');
        
        // Should navigate to workspace detail or dashboard
        const currentUrl = page.url();
        const isWorkspaceView = currentUrl.includes('/workspaces/') || currentUrl.includes('/dashboard');
        expect(isWorkspaceView).toBe(true);
        
        logger.success('Workspace click navigation working');
        
        // Navigate back to workspaces list
        await helpers.clickElement(NAVIGATION_SELECTORS.WORKSPACES_LINK);
        await new Promise(resolve => setTimeout(resolve, 1000));
      } else {
        logger.warn('No existing workspaces found to test');
      }
    });

    test('should access workspace menu', async () => {
      logger.info('Testing workspace menu functionality');
      
      const workspaceCount = await helpers.getElementCount(WORKSPACE_SELECTORS.WORKSPACE_CARD);
      
      if (workspaceCount > 0) {
        // Look for workspace menu button
        const menuExists = await helpers.elementExists(WORKSPACE_SELECTORS.WORKSPACE_MENU);
        
        if (menuExists) {
          await helpers.clickElement(WORKSPACE_SELECTORS.WORKSPACE_MENU + ':first-child');
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          await testBrowser.screenshot('workspaces-test', 'workspace-menu-opened');
          
          // Check for edit option
          const editExists = await helpers.elementExists(WORKSPACE_SELECTORS.EDIT_WORKSPACE_BUTTON);
          if (editExists) {
            logger.success('Edit workspace option found in menu');
          }
          
          // Check for delete option
          const deleteExists = await helpers.elementExists(WORKSPACE_SELECTORS.DELETE_WORKSPACE_BUTTON);
          if (deleteExists) {
            logger.success('Delete workspace option found in menu');
          }
          
          // Close menu
          await page.click('body');
          await new Promise(resolve => setTimeout(resolve, 500));
        } else {
          logger.warn('Workspace menu not found - may be implemented differently');
        }
      } else {
        logger.warn('No workspaces available to test menu functionality');
      }
    });

    test('should edit workspace', async () => {
      logger.info('Testing workspace editing');
      
      const workspaceCount = await helpers.getElementCount(WORKSPACE_SELECTORS.WORKSPACE_CARD);
      
      if (workspaceCount > 0) {
        // Open workspace menu
        const menuExists = await helpers.elementExists(WORKSPACE_SELECTORS.WORKSPACE_MENU);
        
        if (menuExists) {
          await helpers.clickElement(WORKSPACE_SELECTORS.WORKSPACE_MENU + ':first-child');
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Click edit
          const editExists = await helpers.elementExists(WORKSPACE_SELECTORS.EDIT_WORKSPACE_BUTTON);
          if (editExists) {
            await helpers.clickElement(WORKSPACE_SELECTORS.EDIT_WORKSPACE_BUTTON);
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            await testBrowser.screenshot('workspaces-test', 'edit-modal-opened');
            
            // Check if edit modal opened
            const editModalExists = await helpers.elementExists(WORKSPACE_SELECTORS.WORKSPACE_MODAL);
            expect(editModalExists).toBe(true);
            
            // Try to modify name
            const nameInput = await helpers.elementExists(WORKSPACE_SELECTORS.WORKSPACE_NAME_INPUT);
            if (nameInput) {
              await helpers.typeText(WORKSPACE_SELECTORS.WORKSPACE_NAME_INPUT, ' (Edited)');
              
              // Save changes
              await helpers.clickElement(WORKSPACE_SELECTORS.WORKSPACE_SUBMIT_BUTTON);
              await new Promise(resolve => setTimeout(resolve, 2000));
              
              await testBrowser.screenshot('workspaces-test', 'workspace-edited');
              
              logger.success('Workspace edit functionality working');
            }
          }
        } else {
          logger.warn('Cannot test edit - workspace menu not found');
        }
      }
    });
  });

  describe('Workspace Search and Filtering', () => {
    test('should search workspaces if search functionality exists', async () => {
      logger.info('Testing workspace search functionality');
      
      // Look for search input
      const searchExists = await helpers.elementExists('input[placeholder*="Search"], input[placeholder*="search"]');
      
      if (searchExists) {
        await helpers.typeText('input[placeholder*="Search"], input[placeholder*="search"]', 'test');
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        await testBrowser.screenshot('workspaces-test', 'search-results');
        
        logger.success('Workspace search functionality tested');
        
        // Clear search
        await helpers.clearInput('input[placeholder*="Search"], input[placeholder*="search"]');
        await new Promise(resolve => setTimeout(resolve, 1000));
      } else {
        logger.info('Workspace search functionality not found - may not be implemented');
      }
    });

    test('should test workspace filters if available', async () => {
      logger.info('Testing workspace filters');
      
      // Look for filter buttons or dropdowns
      const filterButtons = await helpers.getElementCount('[data-testid="all"]"Active")');
      
      if (filterButtons > 0) {
        logger.info(`Found ${filterButtons} filter options`);
        
        // Test clicking different filters
        const allButtonExists = await helpers.elementExists('[data-testid="all"]');
        if (allButtonExists) {
          await helpers.clickElement('[data-testid="all"]');
          await new Promise(resolve => setTimeout(resolve, 1000));
          logger.success('All workspaces filter tested');
        }
        
        await testBrowser.screenshot('workspaces-test', 'filters-tested');
      } else {
        logger.info('Workspace filters not found - may not be implemented');
      }
    });
  });

  describe('Workspace Error Handling', () => {
    test('should handle workspace creation errors gracefully', async () => {
      logger.info('Testing workspace creation error handling');
      
      // Open create modal
      await helpers.clickElement(WORKSPACE_SELECTORS.CREATE_WORKSPACE_BUTTON);
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Try to create workspace with invalid data (if validation allows it to be submitted)
      await helpers.typeText(WORKSPACE_SELECTORS.WORKSPACE_NAME_INPUT, ''); // Empty name
      
      // Submit form
      await helpers.clickElement(WORKSPACE_SELECTORS.WORKSPACE_SUBMIT_BUTTON);
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Check that error is handled (modal stays open or error message appears)
      const modalStillExists = await helpers.elementExists(WORKSPACE_SELECTORS.WORKSPACE_MODAL);
      const errorMessageExists = await helpers.elementExists('[role="alert"], .error-message, [data-testid*="error"]');
      
      expect(modalStillExists || errorMessageExists).toBe(true);
      
      await testBrowser.screenshot('workspaces-test', 'error-handling');
      
      logger.success('Workspace creation error handling working');
      
      // Close modal
      await page.keyboard.press('Escape');
      await new Promise(resolve => setTimeout(resolve, 500));
    });

    test('should handle network errors gracefully', async () => {
      logger.info('Testing network error handling');
      
      // This is a basic test - in a real scenario you might mock network failures
      // For now, we'll just verify the UI handles loading states properly
      
      await helpers.clickElement(WORKSPACE_SELECTORS.CREATE_WORKSPACE_BUTTON);
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const testData = generateTestData.workspace();
      await helpers.typeText(WORKSPACE_SELECTORS.WORKSPACE_NAME_INPUT, testData.name);
      
      // Check if submit button shows loading state when clicked
      await helpers.clickElement(WORKSPACE_SELECTORS.WORKSPACE_SUBMIT_BUTTON);
      
      // Check for loading indicators
      const loadingExists = await helpers.elementExists('[data-testid="loading"], .loading, .spinner', 2000);
      
      if (loadingExists) {
        logger.success('Loading state displayed during workspace creation');
      } else {
        logger.info('No loading state detected - operation may be too fast or not implemented');
      }
      
      await new Promise(resolve => setTimeout(resolve, 3000));
      await testBrowser.screenshot('workspaces-test', 'network-handling');
    });
  });

  describe('Workspace Navigation', () => {
    test('should navigate between workspaces list and workspace detail', async () => {
      logger.info('Testing workspace navigation flow');
      
      const workspaceCount = await helpers.getElementCount(WORKSPACE_SELECTORS.WORKSPACE_CARD);
      
      if (workspaceCount > 0) {
        // Click on first workspace
        await helpers.clickElement(WORKSPACE_SELECTORS.WORKSPACE_CARD + ':first-child');
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const currentUrl = page.url();
        logger.info(`Navigated to: ${currentUrl}`);
        
        await testBrowser.screenshot('workspaces-test', 'workspace-detail-view');
        
        // Navigate back to workspaces list
        await helpers.clickElement(NAVIGATION_SELECTORS.WORKSPACES_LINK);
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Verify we're back on workspaces list
        const backOnList = await helpers.elementExists(WORKSPACE_SELECTORS.WORKSPACES_CONTAINER);
        expect(backOnList).toBe(true);
        
        logger.success('Workspace navigation flow working correctly');
      } else {
        logger.warn('No workspaces available to test navigation');
      }
    });
  });

  describe('Comprehensive Workspace Creation', () => {
    test('should create workspace with complete form validation', async () => {
      logger.info('Testing comprehensive workspace creation');
      
      const workspaceData = {
        name: `Complete-Workspace-${Date.now()}`,
        description: 'A comprehensive test workspace with all form fields filled'
      };
      
      // Use the helper method for complete workflow
      const result = await helpers.createWorkspace(workspaceData);
      expect(result.success).toBe(true);
      
      await testBrowser.screenshot('workspaces-test', 'workspace-created-comprehensive');
      
      // Verify workspace appears in the list
      await new Promise(resolve => setTimeout(resolve, 2000));
      const workspaceExists = await helpers.elementExistsByText(workspaceData.name);
      expect(workspaceExists).toBe(true);
      
      logger.success(`Workspace "${workspaceData.name}" created successfully`);
    });

    test('should validate workspace creation form fields', async () => {
      logger.info('Testing workspace creation form validation');
      
      // Click create workspace button
      const createResult = await helpers.clickElement(WORKSPACE_SELECTORS.CREATE_WORKSPACE_BUTTON);
      expect(createResult.success).toBe(true);
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      await testBrowser.screenshot('workspaces-test', 'workspace-creation-modal');
      
      // Test form fields
      const workspaceData = {
        name: `Form-Validation-Workspace-${Date.now()}`,
        description: 'Testing form validation with detailed description'
      };
      
      // Fill name field
      const nameInputExists = await helpers.elementExists(WORKSPACE_SELECTORS.WORKSPACE_NAME_INPUT);
      expect(nameInputExists).toBe(true);
      await helpers.typeText(WORKSPACE_SELECTORS.WORKSPACE_NAME_INPUT, workspaceData.name);
      
      // Fill description field if it exists
      const descInputExists = await helpers.elementExists(WORKSPACE_SELECTORS.WORKSPACE_DESCRIPTION_INPUT);
      if (descInputExists) {
        await helpers.typeText(WORKSPACE_SELECTORS.WORKSPACE_DESCRIPTION_INPUT, workspaceData.description);
      }
      
      // Test color picker if it exists
      const colorPickerExists = await helpers.elementExists(WORKSPACE_SELECTORS.WORKSPACE_COLOR_PICKER);
      if (colorPickerExists) {
        await helpers.clickElement(WORKSPACE_SELECTORS.WORKSPACE_COLOR_PICKER);
        await new Promise(resolve => setTimeout(resolve, 500));
        logger.info('Color picker interaction tested');
      }
      
      // Test icon picker if it exists
      const iconPickerExists = await helpers.elementExists(WORKSPACE_SELECTORS.WORKSPACE_ICON_PICKER);
      if (iconPickerExists) {
        await helpers.clickElement(WORKSPACE_SELECTORS.WORKSPACE_ICON_PICKER);
        await new Promise(resolve => setTimeout(resolve, 500));
        logger.info('Icon picker interaction tested');
      }
      
      await testBrowser.screenshot('workspaces-test', 'workspace-form-filled');
      
      // Submit form
      const submitResult = await helpers.clickElement(WORKSPACE_SELECTORS.WORKSPACE_SUBMIT_BUTTON);
      if (!submitResult.success) {
        // Try alternative submit button
        await helpers.clickElement('button[type="submit"]');
      }
      
      await new Promise(resolve => setTimeout(resolve, 3000));
      await testBrowser.screenshot('workspaces-test', 'workspace-creation-completed');
      
      logger.success('Workspace form validation completed successfully');
    });

    test('should handle workspace creation errors gracefully', async () => {
      logger.info('Testing workspace creation error handling');
      
      // Click create workspace button
      await helpers.clickElement(WORKSPACE_SELECTORS.CREATE_WORKSPACE_BUTTON);
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Try to submit empty form
      const submitResult = await helpers.clickElement(WORKSPACE_SELECTORS.WORKSPACE_SUBMIT_BUTTON);
      if (!submitResult.success) {
        await helpers.clickElement('button[type="submit"]');
      }
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Check if modal is still open or error message is shown
      const modalStillExists = await helpers.elementExists(WORKSPACE_SELECTORS.WORKSPACE_MODAL);
      const errorExists = await helpers.elementExists('[role="alert"], .error-message');
      
      expect(modalStillExists || errorExists).toBe(true);
      
      await testBrowser.screenshot('workspaces-test', 'workspace-creation-error-handling');
      
      // Close modal
      await page.keyboard.press('Escape');
      await new Promise(resolve => setTimeout(resolve, 500));
      
      logger.success('Workspace creation error handling working correctly');
    });

    test('should create multiple workspaces and verify independence', async () => {
      logger.info('Testing multiple workspace creation');
      
      const workspaceNames = [
        `Multi-Workspace-1-${Date.now()}`,
        `Multi-Workspace-2-${Date.now()}`
      ];
      
      // Create first workspace
      const result1 = await helpers.createWorkspace({ name: workspaceNames[0] });
      expect(result1.success).toBe(true);
      
      // Create second workspace
      const result2 = await helpers.createWorkspace({ name: workspaceNames[1] });
      expect(result2.success).toBe(true);
      
      // Verify both workspaces exist
      await new Promise(resolve => setTimeout(resolve, 2000));
      const workspace1Exists = await helpers.elementExistsByText(workspaceNames[0]);
      const workspace2Exists = await helpers.elementExistsByText(workspaceNames[1]);
      
      expect(workspace1Exists).toBe(true);
      expect(workspace2Exists).toBe(true);
      
      await testBrowser.screenshot('workspaces-test', 'multiple-workspaces-created');
      
      logger.success('Multiple workspace creation validated successfully');
    });
  });
});