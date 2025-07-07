import { Page } from 'puppeteer';
import { config } from '../e2e/setup';
import { AUTH_SELECTORS, TASK_SELECTORS, WORKSPACE_SELECTORS, FILE_SELECTORS } from './selectors';

export interface TestResult {
  success: boolean;
  message: string;
  details?: any;
  screenshot?: string;
}

export class TestHelpers {
  constructor(private page: Page) {}

  // Navigation helpers
  async navigateTo(url: string): Promise<TestResult> {
    try {
      const fullUrl = url.startsWith('http') ? url : `${config.baseUrl}${url}`;
      await this.page.goto(fullUrl, { waitUntil: 'networkidle0' });
      
      return {
        success: true,
        message: `Successfully navigated to ${fullUrl}`
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to navigate to ${url}`,
        details: error.message
      };
    }
  }

  async waitForLoad(): Promise<void> {
    await this.page.waitForNavigation({ waitUntil: 'networkidle0' });
    await new Promise(resolve => setTimeout(resolve, 1000)); // Additional buffer
  }

  // Element interaction helpers
  async clickElement(selector: string, options?: { timeout?: number }): Promise<TestResult> {
    try {
      await this.page.waitForSelector(selector, { timeout: options?.timeout || config.timeout });
      await this.page.click(selector);
      await new Promise(resolve => setTimeout(resolve, 500)); // Wait for click effects
      
      return {
        success: true,
        message: `Successfully clicked element: ${selector}`
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to click element: ${selector}`,
        details: error.message
      };
    }
  }

  async typeText(selector: string, text: string, options?: { clear?: boolean; delay?: number }): Promise<TestResult> {
    try {
      await this.page.waitForSelector(selector, { timeout: config.timeout });
      
      if (options?.clear !== false) {
        await this.page.evaluate((sel) => {
          const element = document.querySelector(sel) as HTMLInputElement;
          if (element) element.value = '';
        }, selector);
      }
      
      await this.page.type(selector, text, { delay: options?.delay || 50 });
      
      return {
        success: true,
        message: `Successfully typed text into: ${selector}`
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to type text into: ${selector}`,
        details: error.message
      };
    }
  }

  async selectOption(selector: string, value: string): Promise<TestResult> {
    try {
      await this.page.waitForSelector(selector, { timeout: config.timeout });
      await this.page.select(selector, value);
      
      return {
        success: true,
        message: `Successfully selected option ${value} in: ${selector}`
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to select option in: ${selector}`,
        details: error.message
      };
    }
  }

  async checkCheckbox(selector: string, checked: boolean = true): Promise<TestResult> {
    try {
      await this.page.waitForSelector(selector, { timeout: config.timeout });
      
      const isChecked = await this.page.evaluate((sel) => {
        const element = document.querySelector(sel) as HTMLInputElement;
        return element ? element.checked : false;
      }, selector);
      
      if (isChecked !== checked) {
        await this.page.click(selector);
      }
      
      return {
        success: true,
        message: `Successfully ${checked ? 'checked' : 'unchecked'} checkbox: ${selector}`
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to ${checked ? 'check' : 'uncheck'} checkbox: ${selector}`,
        details: error.message
      };
    }
  }

  // Form helpers
  async fillForm(formData: Record<string, string>): Promise<TestResult[]> {
    const results: TestResult[] = [];
    
    for (const [selector, value] of Object.entries(formData)) {
      const result = await this.typeText(selector, value);
      results.push(result);
      
      if (!result.success) {
        break; // Stop on first error
      }
    }
    
    return results;
  }

  async submitForm(formSelector?: string): Promise<TestResult> {
    try {
      const selector = formSelector || 'button[type="submit"]';
      await this.page.waitForSelector(selector, { timeout: config.timeout });
      await this.page.click(selector);
      
      // Wait for form submission
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      return {
        success: true,
        message: `Successfully submitted form`
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to submit form`,
        details: error.message
      };
    }
  }

  // Text-based element finding (Puppeteer compatible)
  async findByText(text: string, element: string = '*', exact: boolean = false): Promise<any> {
    try {
      return await this.page.evaluateHandle((searchText, elementType, isExact) => {
        const elements = Array.from(document.querySelectorAll(elementType));
        return elements.find(el => {
          const textContent = el.textContent?.trim() || '';
          return isExact ? textContent === searchText : textContent.includes(searchText);
        });
      }, text, element, exact);
    } catch {
      return null;
    }
  }

  async clickByText(text: string, element: string = 'button', exact: boolean = false): Promise<TestResult> {
    try {
      const elementHandle = await this.findByText(text, element, exact);
      if (elementHandle) {
        await elementHandle.click();
        await new Promise(resolve => setTimeout(resolve, 500));
        return {
          success: true,
          message: `Successfully clicked element with text: ${text}`
        };
      } else {
        return {
          success: false,
          message: `Element with text "${text}" not found`
        };
      }
    } catch (error) {
      return {
        success: false,
        message: `Failed to click element with text: ${text}`,
        details: error.message
      };
    }
  }

  async elementExistsByText(text: string, element: string = '*', timeout: number = 5000): Promise<boolean> {
    try {
      await this.page.waitForFunction(
        (searchText, elementType) => {
          const elements = Array.from(document.querySelectorAll(elementType));
          return elements.some(el => el.textContent?.includes(searchText));
        },
        { timeout },
        text,
        element
      );
      return true;
    } catch {
      return false;
    }
  }

  // Verification helpers
  async elementExists(selector: string, timeout?: number): Promise<boolean> {
    try {
      await this.page.waitForSelector(selector, { timeout: timeout || 5000 });
      return true;
    } catch {
      return false;
    }
  }

  async elementVisible(selector: string): Promise<boolean> {
    try {
      const element = await this.page.$(selector);
      if (!element) return false;
      
      const isVisible = await element.evaluate((el) => {
        const style = window.getComputedStyle(el);
        return style.display !== 'none' && 
               style.visibility !== 'hidden' && 
               style.opacity !== '0';
      });
      
      return isVisible;
    } catch {
      return false;
    }
  }

  async getText(selector: string): Promise<string> {
    try {
      await this.page.waitForSelector(selector, { timeout: config.timeout });
      return await this.page.evaluate((sel) => {
        const element = document.querySelector(sel);
        return element ? element.textContent || '' : '';
      }, selector);
    } catch {
      return '';
    }
  }

  async getValue(selector: string): Promise<string> {
    try {
      await this.page.waitForSelector(selector, { timeout: config.timeout });
      return await this.page.evaluate((sel) => {
        const element = document.querySelector(sel) as HTMLInputElement;
        return element ? element.value || '' : '';
      }, selector);
    } catch {
      return '';
    }
  }

  async getElementCount(selector: string): Promise<number> {
    try {
      const elements = await this.page.$$(selector);
      return elements.length;
    } catch {
      return 0;
    }
  }

  // Wait helpers
  async waitForElement(selector: string, timeout?: number): Promise<TestResult> {
    try {
      await this.page.waitForSelector(selector, { timeout: timeout || config.timeout });
      return {
        success: true,
        message: `Element found: ${selector}`
      };
    } catch (error) {
      return {
        success: false,
        message: `Element not found: ${selector}`,
        details: error.message
      };
    }
  }

  async waitForText(text: string, timeout?: number): Promise<TestResult> {
    try {
      await this.page.waitForFunction(
        (searchText) => document.body.innerText.includes(searchText),
        { timeout: timeout || config.timeout },
        text
      );
      return {
        success: true,
        message: `Text found: ${text}`
      };
    } catch (error) {
      return {
        success: false,
        message: `Text not found: ${text}`,
        details: error.message
      };
    }
  }

  async waitForNavigation(expectedUrl?: string, timeout?: number): Promise<TestResult> {
    try {
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for navigation
      
      if (expectedUrl) {
        const currentUrl = this.page.url();
        if (!currentUrl.includes(expectedUrl)) {
          return {
            success: false,
            message: `Navigation verification failed`,
            details: `Expected URL to contain '${expectedUrl}', but got '${currentUrl}'`
          };
        }
      }
      
      return {
        success: true,
        message: `Navigation completed successfully`
      };
    } catch (error) {
      return {
        success: false,
        message: `Navigation timeout`,
        details: error.message
      };
    }
  }

  // Authentication helpers
  async login(email?: string, password?: string): Promise<TestResult> {
    const credentials = {
      email: email || config.credentials.email,
      password: password || config.credentials.password
    };

    try {
      // Navigate to login page
      await this.navigateTo('/login');
      
      // Fill login form
      await this.typeText(AUTH_SELECTORS.EMAIL_INPUT, credentials.email);
      await this.typeText(AUTH_SELECTORS.PASSWORD_INPUT, credentials.password);
      
      // Submit form
      await this.clickElement(AUTH_SELECTORS.LOGIN_BUTTON);
      
      // Wait for redirect to dashboard
      await this.waitForNavigation('/dashboard');
      
      // Verify login success by checking for dashboard elements or URL
      const currentUrl = this.page.url();
      const isDashboard = await this.elementExists('[data-testid="dashboard"], main') || currentUrl.includes('/dashboard');
      
      if (isDashboard) {
        return {
          success: true,
          message: `Successfully logged in as ${credentials.email}`
        };
      } else {
        return {
          success: false,
          message: `Login appeared to succeed but dashboard not loaded`
        };
      }
    } catch (error) {
      return {
        success: false,
        message: `Login failed`,
        details: error.message
      };
    }
  }

  async logout(): Promise<TestResult> {
    try {
      // Click user menu
      const userMenuExists = await this.elementExists('[data-testid="user-menu"], button[aria-label="User menu"]');
      if (userMenuExists) {
        await this.clickElement('[data-testid="user-menu"], button[aria-label="User menu"]');
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      // Try clicking logout button by text
      const logoutResult = await this.clickByText('Log out', 'button');
      if (!logoutResult.success) {
        const signoutResult = await this.clickByText('Sign out', 'button');
        if (!signoutResult.success) {
          // Fallback to data-testid
          await this.clickElement('button[data-testid="logout-button"]');
        }
      }
      
      // Wait for redirect to home/login
      await this.waitForNavigation('/');
      
      return {
        success: true,
        message: `Successfully logged out`
      };
    } catch (error) {
      return {
        success: false,
        message: `Logout failed`,
        details: error.message
      };
    }
  }

  // Utility helpers
  async scrollToElement(selector: string): Promise<void> {
    await this.page.evaluate((sel) => {
      const element = document.querySelector(sel);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, selector);
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  async hover(selector: string): Promise<TestResult> {
    try {
      await this.page.waitForSelector(selector, { timeout: config.timeout });
      await this.page.hover(selector);
      await new Promise(resolve => setTimeout(resolve, 500));
      
      return {
        success: true,
        message: `Successfully hovered over: ${selector}`
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to hover over: ${selector}`,
        details: error.message
      };
    }
  }

  async pressKey(key: string): Promise<TestResult> {
    try {
      await this.page.keyboard.press(key);
      await new Promise(resolve => setTimeout(resolve, 500));
      
      return {
        success: true,
        message: `Successfully pressed key: ${key}`
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to press key: ${key}`,
        details: error.message
      };
    }
  }

  async clearInput(selector: string): Promise<TestResult> {
    try {
      await this.page.waitForSelector(selector, { timeout: config.timeout });
      await this.page.evaluate((sel) => {
        const element = document.querySelector(sel) as HTMLInputElement;
        if (element) {
          element.value = '';
          element.dispatchEvent(new Event('input', { bubbles: true }));
        }
      }, selector);
      
      return {
        success: true,
        message: `Successfully cleared input: ${selector}`
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to clear input: ${selector}`,
        details: error.message
      };
    }
  }

  // Workspace management helpers
  async createWorkspace(workspaceData: {
    name: string;
    description?: string;
    color?: string;
  }): Promise<TestResult> {
    try {
      // Navigate to workspaces page
      await this.navigateTo('/dashboard/workspaces');
      await new Promise(resolve => setTimeout(resolve, 3000)); // Longer wait for page load

      // Wait for page to be fully loaded
      await this.waitForElement('[data-testid="create-workspace"], button:has-text("New Workspace"), button:contains("New Workspace")');

      // Click create workspace button with multiple fallback selectors
      let createResult = await this.clickElement(WORKSPACE_SELECTORS.CREATE_WORKSPACE_BUTTON);
      
      // If first selector fails, try alternative selectors
      if (!createResult.success) {
        createResult = await this.clickByText('New Workspace', 'button');
      }
      
      if (!createResult.success) {
        createResult = await this.clickElement('button:has-text("New Workspace")');
      }
      
      if (!createResult.success) {
        return {
          success: false,
          message: 'Could not find create workspace button',
          details: createResult.details
        };
      }

      // Wait for modal to appear
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Wait for modal elements
      const modalResult = await this.waitForElement('[data-testid="workspace-modal"], [role="dialog"], .modal');
      if (!modalResult.success) {
        return {
          success: false,
          message: 'Workspace modal did not appear',
          details: modalResult.details
        };
      }

      // Fill workspace form with better error handling
      const nameResult = await this.typeText(WORKSPACE_SELECTORS.WORKSPACE_NAME_INPUT, workspaceData.name);
      if (!nameResult.success) {
        return {
          success: false,
          message: 'Could not fill workspace name',
          details: nameResult.details
        };
      }
      
      if (workspaceData.description) {
        const descResult = await this.typeText(WORKSPACE_SELECTORS.WORKSPACE_DESCRIPTION_INPUT, workspaceData.description);
        if (!descResult.success) {
          return {
            success: false,
            message: 'Could not fill workspace description',
            details: descResult.details
          };
        }
      }

      // Submit form with multiple fallback selectors
      let submitResult = await this.clickElement(WORKSPACE_SELECTORS.WORKSPACE_SUBMIT_BUTTON);
      
      if (!submitResult.success) {
        submitResult = await this.clickByText('Create Workspace', 'button');
      }
      
      if (!submitResult.success) {
        submitResult = await this.clickElement('button[type="submit"]');
      }
      
      if (!submitResult.success) {
        return {
          success: false,
          message: 'Could not submit workspace form',
          details: submitResult.details
        };
      }

      // Wait longer for workspace creation to complete
      await new Promise(resolve => setTimeout(resolve, 5000));

      // Verify workspace was created by checking if we're back on the workspaces page
      const currentUrl = this.page.url();
      if (!currentUrl.includes('/workspaces')) {
        return {
          success: false,
          message: 'Not redirected back to workspaces page after creation'
        };
      }

      return {
        success: true,
        message: `Successfully created workspace: ${workspaceData.name}`
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to create workspace: ${workspaceData.name}`,
        details: (error as Error).message
      };
    }
  }

  // Task management helpers
  async createTask(taskData: {
    title: string;
    description?: string;
    priority?: string;
    status?: string;
    workspaceId?: string;
    dueDate?: string;
  }): Promise<TestResult> {
    try {
      // Navigate to tasks page
      await this.navigateTo('/dashboard/tasks');
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Click create task button
      const createResult = await this.clickElement(TASK_SELECTORS.CREATE_TASK_BUTTON);
      if (!createResult.success) {
        return createResult;
      }

      await new Promise(resolve => setTimeout(resolve, 1000));

      // Fill task form
      await this.typeText(TASK_SELECTORS.TASK_TITLE_INPUT, taskData.title);
      
      if (taskData.description) {
        await this.typeText(TASK_SELECTORS.TASK_DESCRIPTION_INPUT, taskData.description);
      }

      if (taskData.priority) {
        await this.selectOption(TASK_SELECTORS.TASK_PRIORITY_SELECT, taskData.priority);
      }

      if (taskData.status) {
        await this.selectOption(TASK_SELECTORS.TASK_STATUS_SELECT, taskData.status);
      }

      if (taskData.workspaceId) {
        await this.selectOption(TASK_SELECTORS.TASK_WORKSPACE_SELECT, taskData.workspaceId);
      }

      if (taskData.dueDate) {
        await this.typeText(TASK_SELECTORS.TASK_DUE_DATE_INPUT, taskData.dueDate);
      }

      // Submit form
      const submitResult = await this.clickElement(TASK_SELECTORS.TASK_SUBMIT_BUTTON);
      if (!submitResult.success) {
        return submitResult;
      }

      await new Promise(resolve => setTimeout(resolve, 3000));

      return {
        success: true,
        message: `Successfully created task: ${taskData.title}`
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to create task: ${taskData.title}`,
        details: error.message
      };
    }
  }

  // File upload helpers
  async uploadFile(filePath: string, workspaceId?: string): Promise<TestResult> {
    try {
      // Navigate to files page
      await this.navigateTo('/dashboard/files');
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Click upload button
      const uploadResult = await this.clickElement(FILE_SELECTORS.UPLOAD_BUTTON);
      if (!uploadResult.success) {
        return {
          success: false,
          message: 'Could not find upload button',
          details: uploadResult.details
        };
      }

      // Wait for modal to appear
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // If workspace selection is available and provided
      if (workspaceId) {
        const workspaceSelectExists = await this.elementExists(FILE_SELECTORS.FILE_WORKSPACE_SELECT);
        if (workspaceSelectExists) {
          await this.selectOption(FILE_SELECTORS.FILE_WORKSPACE_SELECT, workspaceId);
        }
      }

      // Try to find and use file input
      const fileInput = await this.page.$(FILE_SELECTORS.FILE_INPUT);
      if (fileInput) {
        await fileInput.uploadFile(filePath);
      } else {
        return {
          success: false,
          message: 'Could not find file input element'
        };
      }

      // Wait for upload to complete
      await new Promise(resolve => setTimeout(resolve, 8000));

      return {
        success: true,
        message: `Successfully uploaded file: ${filePath}`
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to upload file: ${filePath}`,
        details: (error as Error).message
      };
    }
  }

  // Complete workflow helper
  async createCompleteWorkflow(data: {
    workspaceName: string;
    taskTitle: string;
    filePath?: string;
  }): Promise<TestResult> {
    try {
      // Step 1: Create workspace
      const workspaceResult = await this.createWorkspace({ name: data.workspaceName });
      if (!workspaceResult.success) {
        return workspaceResult;
      }

      // Step 2: Create task linked to workspace
      const taskResult = await this.createTask({ 
        title: data.taskTitle,
        description: `Task for ${data.workspaceName}`,
        priority: 'MEDIUM'
      });
      if (!taskResult.success) {
        return taskResult;
      }

      // Step 3: Upload file if provided
      if (data.filePath) {
        const fileResult = await this.uploadFile(data.filePath);
        if (!fileResult.success) {
          return fileResult;
        }
      }

      return {
        success: true,
        message: `Successfully completed workflow: workspace "${data.workspaceName}", task "${data.taskTitle}"${data.filePath ? ', and file upload' : ''}`
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to complete workflow`,
        details: error.message
      };
    }
  }
}

// Test data generators
export const generateTestData = {
  workspace: () => ({
    name: `Test Workspace ${Date.now()}`,
    description: `Generated test workspace created at ${new Date().toISOString()}`,
    color: '#3B82F6',
    icon: '🚀'
  }),
  
  task: () => ({
    title: `Test Task ${Date.now()}`,
    description: `Generated test task created at ${new Date().toISOString()}`,
    priority: 'medium',
    status: 'pending'
  }),
  
  user: () => ({
    name: `Test User ${Date.now()}`,
    email: `test-${Date.now()}@example.com`,
    bio: `Test user bio generated at ${new Date().toISOString()}`
  })
};

// Common test patterns
export const testPatterns = {
  async testButtonClick(helpers: TestHelpers, selector: string, expectedResult?: string): Promise<TestResult> {
    const result = await helpers.clickElement(selector);
    
    if (result.success && expectedResult) {
      const textResult = await helpers.waitForText(expectedResult, 5000);
      if (!textResult.success) {
        return {
          success: false,
          message: `Button clicked but expected result not found: ${expectedResult}`,
          details: result
        };
      }
    }
    
    return result;
  },
  
  async testFormSubmission(helpers: TestHelpers, formData: Record<string, string>, submitSelector?: string): Promise<TestResult> {
    const fillResults = await helpers.fillForm(formData);
    const failedFill = fillResults.find(r => !r.success);
    
    if (failedFill) {
      return failedFill;
    }
    
    return await helpers.submitForm(submitSelector);
  },
  
  async testModalInteraction(helpers: TestHelpers, triggerSelector: string, modalSelector: string, actions: () => Promise<TestResult>): Promise<TestResult> {
    // Open modal
    const openResult = await helpers.clickElement(triggerSelector);
    if (!openResult.success) return openResult;
    
    // Wait for modal to appear
    const modalResult = await helpers.waitForElement(modalSelector);
    if (!modalResult.success) return modalResult;
    
    // Perform actions in modal
    const actionResult = await actions();
    
    return actionResult;
  }
};