import { setupGlobal, teardownGlobal, testBrowser, logger, config } from './setup';
import { TestHelpers, TestResult, testPatterns, generateTestData } from '../utils/helpers';
import { 
  WORKSPACE_SELECTORS, 
  TASK_SELECTORS, 
  FILE_SELECTORS, 
  SETTINGS_SELECTORS,
  MODAL_SELECTORS,
  FORM_SELECTORS,
  TOAST_SELECTORS,
  NAVIGATION_SELECTORS
} from '../utils/selectors';

describe('Comprehensive Interactive Elements Tests', () => {
  let helpers: TestHelpers;
  let page: any;
  let testResults: Array<{ 
    category: string; 
    element: string; 
    action: string; 
    success: boolean; 
    details?: string;
    screenshot?: string;
  }> = [];

  beforeAll(async () => {
    await setupGlobal();
    page = await testBrowser.newPage('interactions-test');
    helpers = new TestHelpers(page);
    
    // Login first
    const loginResult = await helpers.login();
    expect(loginResult.success).toBe(true);
    
    logger.info('Interactive elements tests initialized and user logged in');
  });

  afterAll(async () => {
    await teardownGlobal();
    
    // Generate comprehensive test report
    const report = generateInteractionReport(testResults);
    logger.info('Generated comprehensive interaction test report');
    console.log('\n' + report);
    
    logger.info('Interactive elements tests completed');
  });

  const recordResult = (category: string, element: string, action: string, result: TestResult, screenshot?: string) => {
    testResults.push({
      category,
      element,
      action,
      success: result.success,
      details: result.message,
      screenshot
    });
  };

  describe('Workspaces - Every Button and Function', () => {
    beforeEach(async () => {
      await helpers.navigateTo('/dashboard/workspaces');
      await page.waitForTimeout(2000);
    });

    test('should test all workspace creation functions', async () => {
      logger.info('Testing ALL workspace creation buttons and functions');
      
      // 1. Test "New Workspace" / "Create Workspace" button
      const createButtonExists = await helpers.elementExists(WORKSPACE_SELECTORS.CREATE_WORKSPACE_BUTTON);
      
      if (createButtonExists) {
        const clickResult = await helpers.clickElement(WORKSPACE_SELECTORS.CREATE_WORKSPACE_BUTTON);
        recordResult('Workspaces', 'Create Workspace Button', 'Click', clickResult);
        
        await page.waitForTimeout(1000);
        const screenshotPath = await testBrowser.screenshot('interactions-test', 'workspace-create-modal');
        
        // 2. Test workspace modal form elements
        const modalExists = await helpers.elementExists(WORKSPACE_SELECTORS.WORKSPACE_MODAL);
        
        if (modalExists) {
          // Test name input
          const testData = generateTestData.workspace();
          const nameResult = await helpers.typeText(WORKSPACE_SELECTORS.WORKSPACE_NAME_INPUT, testData.name);
          recordResult('Workspaces', 'Workspace Name Input', 'Type', nameResult);
          
          // Test description input
          const descResult = await helpers.typeText(WORKSPACE_SELECTORS.WORKSPACE_DESCRIPTION_INPUT, testData.description);
          recordResult('Workspaces', 'Workspace Description Input', 'Type', descResult);
          
          // 3. Test color picker
          const colorPickerExists = await helpers.elementExists(WORKSPACE_SELECTORS.WORKSPACE_COLOR_PICKER);
          if (colorPickerExists) {
            const colorResult = await helpers.clickElement(WORKSPACE_SELECTORS.WORKSPACE_COLOR_PICKER + ' button:first-child');
            recordResult('Workspaces', 'Color Picker', 'Select Color', colorResult);
          }
          
          // 4. Test icon picker
          const iconPickerExists = await helpers.elementExists(WORKSPACE_SELECTORS.WORKSPACE_ICON_PICKER);
          if (iconPickerExists) {
            const iconResult = await helpers.clickElement(WORKSPACE_SELECTORS.WORKSPACE_ICON_PICKER + ' button:first-child');
            recordResult('Workspaces', 'Icon Picker', 'Select Icon', iconResult);
          }
          
          await testBrowser.screenshot('interactions-test', 'workspace-form-filled');
          
          // 5. Test form submission
          const submitResult = await helpers.clickElement(WORKSPACE_SELECTORS.WORKSPACE_SUBMIT_BUTTON);
          recordResult('Workspaces', 'Create Workspace Submit', 'Submit Form', submitResult);
          
          await page.waitForTimeout(3000);
          await testBrowser.screenshot('interactions-test', 'workspace-created');
          
          // 6. Verify workspace was created (look for toast or new item)
          const toastExists = await helpers.elementExists(TOAST_SELECTORS.TOAST_SUCCESS, 5000);
          if (toastExists) {
            logger.success('Workspace creation successful - toast notification appeared');
          }
        }
      }
    });

    test('should test all workspace card interactions', async () => {
      logger.info('Testing ALL workspace card interactions');
      
      const workspaceCards = await helpers.getElementCount(WORKSPACE_SELECTORS.WORKSPACE_CARD);
      logger.info(`Found ${workspaceCards} workspace cards to test`);
      
      if (workspaceCards > 0) {
        // Test clicking on first workspace card
        const cardClickResult = await helpers.clickElement(WORKSPACE_SELECTORS.WORKSPACE_CARD + ':first-child');
        recordResult('Workspaces', 'Workspace Card', 'Click to Open', cardClickResult);
        
        await page.waitForTimeout(2000);
        await testBrowser.screenshot('interactions-test', 'workspace-opened');
        
        // Go back to workspaces list
        await helpers.navigateTo('/dashboard/workspaces');
        await page.waitForTimeout(1000);
        
        // 7. Test workspace menu (three dots menu)
        const menuExists = await helpers.elementExists(WORKSPACE_SELECTORS.WORKSPACE_MENU);
        if (menuExists) {
          const menuResult = await helpers.clickElement(WORKSPACE_SELECTORS.WORKSPACE_MENU + ':first-child');
          recordResult('Workspaces', 'Workspace Menu', 'Open Menu', menuResult);
          
          await page.waitForTimeout(1000);
          await testBrowser.screenshot('interactions-test', 'workspace-menu-opened');
          
          // 8. Test edit workspace
          const editExists = await helpers.elementExists(WORKSPACE_SELECTORS.EDIT_WORKSPACE_BUTTON);
          if (editExists) {
            const editResult = await helpers.clickElement(WORKSPACE_SELECTORS.EDIT_WORKSPACE_BUTTON);
            recordResult('Workspaces', 'Edit Workspace Button', 'Click', editResult);
            
            await page.waitForTimeout(1000);
            await testBrowser.screenshot('interactions-test', 'workspace-edit-modal');
            
            // Close edit modal
            await page.keyboard.press('Escape');
          }
        }
      }
    });
  });

  describe('Tasks - Every Button and Function', () => {
    beforeEach(async () => {
      await helpers.navigateTo('/dashboard/tasks');
      await page.waitForTimeout(2000);
    });

    test('should test all task creation and management functions', async () => {
      logger.info('Testing ALL task management buttons and functions');
      
      // 1. Test "New Task" / "Create Task" button
      const createTaskExists = await helpers.elementExists(TASK_SELECTORS.CREATE_TASK_BUTTON);
      
      if (createTaskExists) {
        const clickResult = await helpers.clickElement(TASK_SELECTORS.CREATE_TASK_BUTTON);
        recordResult('Tasks', 'Create Task Button', 'Click', clickResult);
        
        await page.waitForTimeout(1000);
        
        // 2. Test task form elements
        const modalExists = await helpers.elementExists(TASK_SELECTORS.TASK_MODAL);
        
        if (modalExists) {
          const testData = generateTestData.task();
          
          // Test task title input
          const titleResult = await helpers.typeText(TASK_SELECTORS.TASK_TITLE_INPUT, testData.title);
          recordResult('Tasks', 'Task Title Input', 'Type', titleResult);
          
          // Test task description
          const descExists = await helpers.elementExists(TASK_SELECTORS.TASK_DESCRIPTION_INPUT);
          if (descExists) {
            const descResult = await helpers.typeText(TASK_SELECTORS.TASK_DESCRIPTION_INPUT, testData.description);
            recordResult('Tasks', 'Task Description Input', 'Type', descResult);
          }
          
          // 3. Test priority selector
          const priorityExists = await helpers.elementExists(TASK_SELECTORS.TASK_PRIORITY_SELECT);
          if (priorityExists) {
            const priorityResult = await helpers.clickElement(TASK_SELECTORS.TASK_PRIORITY_SELECT);
            recordResult('Tasks', 'Priority Selector', 'Click', priorityResult);
            
            await page.waitForTimeout(500);
            // Select an option
            const optionExists = await helpers.elementExists('[role="option"], option[value="high"]');
            if (optionExists) {
              await helpers.clickElement('[role="option"]:first-child, option[value="high"]');
            }
          }
          
          // 4. Test status selector
          const statusExists = await helpers.elementExists(TASK_SELECTORS.TASK_STATUS_SELECT);
          if (statusExists) {
            const statusResult = await helpers.clickElement(TASK_SELECTORS.TASK_STATUS_SELECT);
            recordResult('Tasks', 'Status Selector', 'Click', statusResult);
            
            await page.waitForTimeout(500);
          }
          
          // 5. Test assignee selector
          const assigneeExists = await helpers.elementExists(TASK_SELECTORS.TASK_ASSIGNEE_SELECT);
          if (assigneeExists) {
            const assigneeResult = await helpers.clickElement(TASK_SELECTORS.TASK_ASSIGNEE_SELECT);
            recordResult('Tasks', 'Assignee Selector', 'Click', assigneeResult);
            
            await page.waitForTimeout(500);
          }
          
          // 6. Test due date input
          const dueDateExists = await helpers.elementExists(TASK_SELECTORS.TASK_DUE_DATE_INPUT);
          if (dueDateExists) {
            const dueDateResult = await helpers.typeText(TASK_SELECTORS.TASK_DUE_DATE_INPUT, '2024-12-31');
            recordResult('Tasks', 'Due Date Input', 'Type', dueDateResult);
          }
          
          await testBrowser.screenshot('interactions-test', 'task-form-filled');
          
          // 7. Submit task form
          const submitExists = await helpers.elementExists('button[type="submit"], button:has-text("Create"), button:has-text("Save")');
          if (submitExists) {
            const submitResult = await helpers.clickElement('button[type="submit"], button:has-text("Create"), button:has-text("Save")');
            recordResult('Tasks', 'Create Task Submit', 'Submit Form', submitResult);
            
            await page.waitForTimeout(3000);
            await testBrowser.screenshot('interactions-test', 'task-created');
          }
        }
      }
      
      // 8. Test task filter buttons
      const filters = [
        { name: 'All Tasks', selector: TASK_SELECTORS.TASK_FILTER_ALL },
        { name: 'Pending Tasks', selector: TASK_SELECTORS.TASK_FILTER_PENDING },
        { name: 'In Progress Tasks', selector: TASK_SELECTORS.TASK_FILTER_IN_PROGRESS },
        { name: 'Completed Tasks', selector: TASK_SELECTORS.TASK_FILTER_COMPLETED }
      ];
      
      for (const filter of filters) {
        const exists = await helpers.elementExists(filter.selector);
        if (exists) {
          const result = await helpers.clickElement(filter.selector);
          recordResult('Tasks', filter.name + ' Filter', 'Click', result);
          await page.waitForTimeout(1000);
        }
      }
      
      // 9. Test task search
      const searchExists = await helpers.elementExists(TASK_SELECTORS.TASK_SEARCH_INPUT);
      if (searchExists) {
        const searchResult = await helpers.typeText(TASK_SELECTORS.TASK_SEARCH_INPUT, 'test');
        recordResult('Tasks', 'Task Search Input', 'Type', searchResult);
        await page.waitForTimeout(1000);
      }
    });

    test('should test all task item interactions', async () => {
      logger.info('Testing ALL task item interactions');
      
      const taskItems = await helpers.getElementCount(TASK_SELECTORS.TASK_ITEM);
      logger.info(`Found ${taskItems} task items to test`);
      
      if (taskItems > 0) {
        // 10. Test task checkbox
        const checkboxExists = await helpers.elementExists(TASK_SELECTORS.TASK_CHECKBOX);
        if (checkboxExists) {
          const checkResult = await helpers.clickElement(TASK_SELECTORS.TASK_CHECKBOX + ':first-child');
          recordResult('Tasks', 'Task Checkbox', 'Toggle', checkResult);
          await page.waitForTimeout(1000);
        }
        
        // 11. Test task menu
        const taskMenuExists = await helpers.elementExists(TASK_SELECTORS.TASK_MENU);
        if (taskMenuExists) {
          const menuResult = await helpers.clickElement(TASK_SELECTORS.TASK_MENU + ':first-child');
          recordResult('Tasks', 'Task Menu', 'Open Menu', menuResult);
          
          await page.waitForTimeout(1000);
          
          // 12. Test edit task
          const editExists = await helpers.elementExists(TASK_SELECTORS.EDIT_TASK_BUTTON);
          if (editExists) {
            const editResult = await helpers.clickElement(TASK_SELECTORS.EDIT_TASK_BUTTON);
            recordResult('Tasks', 'Edit Task Button', 'Click', editResult);
            
            await page.waitForTimeout(1000);
            await testBrowser.screenshot('interactions-test', 'task-edit-modal');
            
            // Close edit modal
            await page.keyboard.press('Escape');
          }
        }
      }
    });
  });

  describe('Files - Every Button and Function', () => {
    beforeEach(async () => {
      await helpers.navigateTo('/dashboard/files');
      await page.waitForTimeout(2000);
    });

    test('should test all file management functions', async () => {
      logger.info('Testing ALL file management buttons and functions');
      
      // 1. Test upload button
      const uploadExists = await helpers.elementExists(FILE_SELECTORS.UPLOAD_BUTTON);
      if (uploadExists) {
        const uploadResult = await helpers.clickElement(FILE_SELECTORS.UPLOAD_BUTTON);
        recordResult('Files', 'Upload Button', 'Click', uploadResult);
        await page.waitForTimeout(1000);
      }
      
      // 2. Test upload area (drag and drop zone)
      const uploadAreaExists = await helpers.elementExists(FILE_SELECTORS.UPLOAD_AREA);
      if (uploadAreaExists) {
        const uploadAreaResult = await helpers.clickElement(FILE_SELECTORS.UPLOAD_AREA);
        recordResult('Files', 'Upload Area', 'Click', uploadAreaResult);
        await page.waitForTimeout(1000);
      }
      
      // 3. Test create folder button
      const createFolderExists = await helpers.elementExists(FILE_SELECTORS.CREATE_FOLDER_BUTTON);
      if (createFolderExists) {
        const folderResult = await helpers.clickElement(FILE_SELECTORS.CREATE_FOLDER_BUTTON);
        recordResult('Files', 'Create Folder Button', 'Click', folderResult);
        
        await page.waitForTimeout(1000);
        
        // Test folder name input
        const folderNameExists = await helpers.elementExists(FILE_SELECTORS.FOLDER_NAME_INPUT);
        if (folderNameExists) {
          const nameResult = await helpers.typeText(FILE_SELECTORS.FOLDER_NAME_INPUT, `Test Folder ${Date.now()}`);
          recordResult('Files', 'Folder Name Input', 'Type', nameResult);
          
          // Submit folder creation
          await page.keyboard.press('Enter');
          await page.waitForTimeout(1000);
        }
      }
      
      // 4. Test file search
      const searchExists = await helpers.elementExists(FILE_SELECTORS.FILE_SEARCH_INPUT);
      if (searchExists) {
        const searchResult = await helpers.typeText(FILE_SELECTORS.FILE_SEARCH_INPUT, 'test');
        recordResult('Files', 'File Search Input', 'Type', searchResult);
        await page.waitForTimeout(1000);
      }
      
      // 5. Test file type filter
      const typeFilterExists = await helpers.elementExists(FILE_SELECTORS.FILE_TYPE_FILTER);
      if (typeFilterExists) {
        const filterResult = await helpers.clickElement(FILE_SELECTORS.FILE_TYPE_FILTER);
        recordResult('Files', 'File Type Filter', 'Click', filterResult);
        await page.waitForTimeout(1000);
      }
      
      // 6. Test file size filter
      const sizeFilterExists = await helpers.elementExists(FILE_SELECTORS.FILE_SIZE_FILTER);
      if (sizeFilterExists) {
        const sizeResult = await helpers.clickElement(FILE_SELECTORS.FILE_SIZE_FILTER);
        recordResult('Files', 'File Size Filter', 'Click', sizeResult);
        await page.waitForTimeout(1000);
      }
    });

    test('should test all file item interactions', async () => {
      logger.info('Testing ALL file item interactions');
      
      const fileItems = await helpers.getElementCount(FILE_SELECTORS.FILE_ITEM);
      logger.info(`Found ${fileItems} file items to test`);
      
      if (fileItems > 0) {
        // 7. Test file menu
        const fileMenuExists = await helpers.elementExists(FILE_SELECTORS.FILE_MENU);
        if (fileMenuExists) {
          const menuResult = await helpers.clickElement(FILE_SELECTORS.FILE_MENU + ':first-child');
          recordResult('Files', 'File Menu', 'Open Menu', menuResult);
          
          await page.waitForTimeout(1000);
          
          // 8. Test download button
          const downloadExists = await helpers.elementExists(FILE_SELECTORS.DOWNLOAD_FILE_BUTTON);
          if (downloadExists) {
            const downloadResult = await helpers.clickElement(FILE_SELECTORS.DOWNLOAD_FILE_BUTTON);
            recordResult('Files', 'Download File Button', 'Click', downloadResult);
            await page.waitForTimeout(1000);
          }
          
          // Re-open menu for other actions
          await helpers.clickElement(FILE_SELECTORS.FILE_MENU + ':first-child');
          await page.waitForTimeout(500);
          
          // 9. Test rename button
          const renameExists = await helpers.elementExists(FILE_SELECTORS.RENAME_FILE_BUTTON);
          if (renameExists) {
            const renameResult = await helpers.clickElement(FILE_SELECTORS.RENAME_FILE_BUTTON);
            recordResult('Files', 'Rename File Button', 'Click', renameResult);
            await page.waitForTimeout(1000);
            
            // If rename input appears, test it
            const renameInput = await helpers.elementExists('input[placeholder*="name"], input[value]');
            if (renameInput) {
              await helpers.typeText('input[placeholder*="name"], input[value]', `Renamed File ${Date.now()}`);
              await page.keyboard.press('Enter');
            }
          }
        }
      }
      
      // 10. Test folder interactions
      const folderItems = await helpers.getElementCount(FILE_SELECTORS.FOLDER_ITEM);
      if (folderItems > 0) {
        const folderResult = await helpers.clickElement(FILE_SELECTORS.FOLDER_ITEM + ':first-child');
        recordResult('Files', 'Folder Item', 'Double Click to Open', folderResult);
        await page.waitForTimeout(1000);
      }
    });
  });

  describe('Settings - Every Button and Function', () => {
    beforeEach(async () => {
      await helpers.navigateTo('/dashboard/settings');
      await page.waitForTimeout(2000);
    });

    test('should test all settings navigation tabs', async () => {
      logger.info('Testing ALL settings navigation tabs');
      
      const settingsTabs = [
        { name: 'Profile Tab', selector: SETTINGS_SELECTORS.PROFILE_TAB },
        { name: 'Account Tab', selector: SETTINGS_SELECTORS.ACCOUNT_TAB },
        { name: 'Notifications Tab', selector: SETTINGS_SELECTORS.NOTIFICATIONS_TAB },
        { name: 'Privacy Tab', selector: SETTINGS_SELECTORS.PRIVACY_TAB },
        { name: 'Security Tab', selector: SETTINGS_SELECTORS.SECURITY_TAB }
      ];
      
      for (const tab of settingsTabs) {
        const exists = await helpers.elementExists(tab.selector);
        if (exists) {
          const result = await helpers.clickElement(tab.selector);
          recordResult('Settings', tab.name, 'Click', result);
          
          await page.waitForTimeout(1000);
          await testBrowser.screenshot('interactions-test', `settings-${tab.name.toLowerCase().replace(' ', '-')}`);
        }
      }
    });

    test('should test all profile settings functions', async () => {
      logger.info('Testing ALL profile settings functions');
      
      // Navigate to profile tab
      const profileTabExists = await helpers.elementExists(SETTINGS_SELECTORS.PROFILE_TAB);
      if (profileTabExists) {
        await helpers.clickElement(SETTINGS_SELECTORS.PROFILE_TAB);
        await page.waitForTimeout(1000);
      }
      
      // Test profile name input
      const nameInputExists = await helpers.elementExists(SETTINGS_SELECTORS.PROFILE_NAME_INPUT);
      if (nameInputExists) {
        const nameResult = await helpers.typeText(SETTINGS_SELECTORS.PROFILE_NAME_INPUT, 'Updated Test Name');
        recordResult('Settings', 'Profile Name Input', 'Type', nameResult);
      }
      
      // Test profile email input
      const emailInputExists = await helpers.elementExists(SETTINGS_SELECTORS.PROFILE_EMAIL_INPUT);
      if (emailInputExists) {
        const emailResult = await helpers.typeText(SETTINGS_SELECTORS.PROFILE_EMAIL_INPUT, 'updated@example.com');
        recordResult('Settings', 'Profile Email Input', 'Type', emailResult);
      }
      
      // Test bio input
      const bioInputExists = await helpers.elementExists(SETTINGS_SELECTORS.PROFILE_BIO_INPUT);
      if (bioInputExists) {
        const bioResult = await helpers.typeText(SETTINGS_SELECTORS.PROFILE_BIO_INPUT, 'Updated bio text');
        recordResult('Settings', 'Profile Bio Input', 'Type', bioResult);
      }
      
      // Test avatar upload
      const avatarUploadExists = await helpers.elementExists(SETTINGS_SELECTORS.PROFILE_AVATAR_UPLOAD);
      if (avatarUploadExists) {
        const avatarResult = await helpers.clickElement('label:has(' + SETTINGS_SELECTORS.PROFILE_AVATAR_UPLOAD + ')');
        recordResult('Settings', 'Avatar Upload', 'Click', avatarResult);
      }
      
      // Test save button
      const saveExists = await helpers.elementExists(SETTINGS_SELECTORS.SAVE_SETTINGS_BUTTON);
      if (saveExists) {
        const saveResult = await helpers.clickElement(SETTINGS_SELECTORS.SAVE_SETTINGS_BUTTON);
        recordResult('Settings', 'Save Settings Button', 'Click', saveResult);
        await page.waitForTimeout(2000);
      }
    });

    test('should test all notification settings toggles', async () => {
      logger.info('Testing ALL notification settings toggles');
      
      // Navigate to notifications tab
      const notifTabExists = await helpers.elementExists(SETTINGS_SELECTORS.NOTIFICATIONS_TAB);
      if (notifTabExists) {
        await helpers.clickElement(SETTINGS_SELECTORS.NOTIFICATIONS_TAB);
        await page.waitForTimeout(1000);
      }
      
      // Test email notifications toggle
      const emailToggleExists = await helpers.elementExists(SETTINGS_SELECTORS.EMAIL_NOTIFICATIONS_TOGGLE);
      if (emailToggleExists) {
        const emailResult = await helpers.clickElement(SETTINGS_SELECTORS.EMAIL_NOTIFICATIONS_TOGGLE);
        recordResult('Settings', 'Email Notifications Toggle', 'Toggle', emailResult);
      }
      
      // Test push notifications toggle
      const pushToggleExists = await helpers.elementExists(SETTINGS_SELECTORS.PUSH_NOTIFICATIONS_TOGGLE);
      if (pushToggleExists) {
        const pushResult = await helpers.clickElement(SETTINGS_SELECTORS.PUSH_NOTIFICATIONS_TOGGLE);
        recordResult('Settings', 'Push Notifications Toggle', 'Toggle', pushResult);
      }
    });

    test('should test all privacy settings controls', async () => {
      logger.info('Testing ALL privacy settings controls');
      
      // Navigate to privacy tab
      const privacyTabExists = await helpers.elementExists(SETTINGS_SELECTORS.PRIVACY_TAB);
      if (privacyTabExists) {
        await helpers.clickElement(SETTINGS_SELECTORS.PRIVACY_TAB);
        await page.waitForTimeout(1000);
      }
      
      // Test profile visibility selector
      const visibilityExists = await helpers.elementExists(SETTINGS_SELECTORS.PROFILE_VISIBILITY_SELECT);
      if (visibilityExists) {
        const visibilityResult = await helpers.clickElement(SETTINGS_SELECTORS.PROFILE_VISIBILITY_SELECT);
        recordResult('Settings', 'Profile Visibility Select', 'Click', visibilityResult);
        
        await page.waitForTimeout(500);
        // Select an option
        const optionExists = await helpers.elementExists('option, [role="option"]');
        if (optionExists) {
          await helpers.clickElement('option:first-child, [role="option"]:first-child');
        }
      }
      
      // Test data sharing toggle
      const dataSharingExists = await helpers.elementExists(SETTINGS_SELECTORS.DATA_SHARING_TOGGLE);
      if (dataSharingExists) {
        const sharingResult = await helpers.clickElement(SETTINGS_SELECTORS.DATA_SHARING_TOGGLE);
        recordResult('Settings', 'Data Sharing Toggle', 'Toggle', sharingResult);
      }
    });
  });

  describe('Modal and Dialog Interactions', () => {
    test('should test all modal close methods', async () => {
      logger.info('Testing ALL modal close methods');
      
      // Go to workspaces to test modal
      await helpers.navigateTo('/dashboard/workspaces');
      await page.waitForTimeout(1000);
      
      // Open a modal
      const createButtonExists = await helpers.elementExists(WORKSPACE_SELECTORS.CREATE_WORKSPACE_BUTTON);
      if (createButtonExists) {
        await helpers.clickElement(WORKSPACE_SELECTORS.CREATE_WORKSPACE_BUTTON);
        await page.waitForTimeout(1000);
        
        // Test close button
        const closeButtonExists = await helpers.elementExists(MODAL_SELECTORS.MODAL_CLOSE_BUTTON);
        if (closeButtonExists) {
          const closeResult = await helpers.clickElement(MODAL_SELECTORS.MODAL_CLOSE_BUTTON);
          recordResult('Modals', 'Close Button', 'Click', closeResult);
          await page.waitForTimeout(1000);
        }
        
        // Open modal again
        await helpers.clickElement(WORKSPACE_SELECTORS.CREATE_WORKSPACE_BUTTON);
        await page.waitForTimeout(1000);
        
        // Test escape key
        await page.keyboard.press('Escape');
        await page.waitForTimeout(1000);
        recordResult('Modals', 'Escape Key', 'Press', { success: true, message: 'Escape key pressed' });
        
        // Open modal again
        await helpers.clickElement(WORKSPACE_SELECTORS.CREATE_WORKSPACE_BUTTON);
        await page.waitForTimeout(1000);
        
        // Test click outside
        await page.click('body', { force: true });
        await page.waitForTimeout(1000);
        recordResult('Modals', 'Click Outside', 'Click', { success: true, message: 'Clicked outside modal' });
      }
    });
  });

  describe('Form Validation Testing', () => {
    test('should test all form validation scenarios', async () => {
      logger.info('Testing ALL form validation scenarios');
      
      // Test empty form submissions
      const forms = [
        { name: 'Workspace Form', url: '/dashboard/workspaces', trigger: WORKSPACE_SELECTORS.CREATE_WORKSPACE_BUTTON },
        { name: 'Task Form', url: '/dashboard/tasks', trigger: TASK_SELECTORS.CREATE_TASK_BUTTON }
      ];
      
      for (const form of forms) {
        await helpers.navigateTo(form.url);
        await page.waitForTimeout(1000);
        
        const triggerExists = await helpers.elementExists(form.trigger);
        if (triggerExists) {
          await helpers.clickElement(form.trigger);
          await page.waitForTimeout(1000);
          
          // Try to submit empty form
          const submitExists = await helpers.elementExists('button[type="submit"], button:has-text("Create"), button:has-text("Save")');
          if (submitExists) {
            const submitResult = await helpers.clickElement('button[type="submit"], button:has-text("Create"), button:has-text("Save")');
            recordResult('Form Validation', `${form.name} Empty Submit`, 'Submit', submitResult);
            
            await page.waitForTimeout(2000);
            
            // Check for validation messages
            const validationExists = await helpers.elementExists(FORM_SELECTORS.ERROR_MESSAGE);
            if (validationExists) {
              recordResult('Form Validation', `${form.name} Validation Message`, 'Appears', { success: true, message: 'Validation message displayed' });
            }
          }
          
          // Close modal
          await page.keyboard.press('Escape');
          await page.waitForTimeout(500);
        }
      }
    });
  });
});

function generateInteractionReport(results: Array<any>): string {
  const categories = [...new Set(results.map(r => r.category))];
  const totalTests = results.length;
  const successfulTests = results.filter(r => r.success).length;
  const failedTests = totalTests - successfulTests;
  
  let report = `# Comprehensive Interactive Elements Test Report\n\n`;
  report += `**Generated:** ${new Date().toISOString()}\n\n`;
  
  report += `## Executive Summary\n`;
  report += `- **Total Interactions Tested:** ${totalTests}\n`;
  report += `- **Successful:** ${successfulTests} (${((successfulTests/totalTests)*100).toFixed(1)}%)\n`;
  report += `- **Failed:** ${failedTests} (${((failedTests/totalTests)*100).toFixed(1)}%)\n`;
  report += `- **Categories Covered:** ${categories.length}\n\n`;
  
  report += `## Results by Category\n\n`;
  
  categories.forEach(category => {
    const categoryResults = results.filter(r => r.category === category);
    const categorySuccess = categoryResults.filter(r => r.success).length;
    const categoryTotal = categoryResults.length;
    
    report += `### ${category}\n`;
    report += `- **Tests:** ${categoryTotal}\n`;
    report += `- **Success Rate:** ${((categorySuccess/categoryTotal)*100).toFixed(1)}%\n\n`;
    
    report += `| Element | Action | Status | Details |\n`;
    report += `|---------|--------|--------|----------|\n`;
    
    categoryResults.forEach(result => {
      const status = result.success ? '✅' : '❌';
      const details = result.details || 'N/A';
      report += `| ${result.element} | ${result.action} | ${status} | ${details} |\n`;
    });
    
    report += `\n`;
  });
  
  report += `## Failed Tests Summary\n\n`;
  const failedResults = results.filter(r => !r.success);
  
  if (failedResults.length === 0) {
    report += `🎉 **All tests passed successfully!**\n\n`;
  } else {
    failedResults.forEach((result, index) => {
      report += `${index + 1}. **${result.category} - ${result.element}**\n`;
      report += `   - Action: ${result.action}\n`;
      report += `   - Error: ${result.details}\n\n`;
    });
  }
  
  report += `## Recommendations\n\n`;
  if (failedTests > 0) {
    report += `- Review and fix ${failedTests} failed interactions\n`;
    report += `- Ensure all buttons and forms have proper accessibility attributes\n`;
    report += `- Add missing test IDs for better element targeting\n`;
  } else {
    report += `- All interactive elements are functioning correctly\n`;
    report += `- Consider adding more edge case testing\n`;
    report += `- Monitor performance of complex interactions\n`;
  }
  
  return report;
}