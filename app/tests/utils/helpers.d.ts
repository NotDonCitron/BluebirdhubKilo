import { Page, ElementHandle } from 'puppeteer';

/**
 * Result of a test operation with status and error information
 */
export interface TestResult {
  success: boolean;
  message?: string;
  error?: Error;
  errorCategory?: ErrorCategory;
  elementState?: ElementState;
  screenshot?: string;
}

/**
 * Categories of errors for better diagnostics
 */
export enum ErrorCategory {
  NAVIGATION = 'navigation',
  ELEMENT_NOT_FOUND = 'element_not_found',
  ELEMENT_NOT_INTERACTABLE = 'element_not_interactable',
  ELEMENT_OBSCURED = 'element_obscured',
  MODAL_INTERACTION = 'modal_interaction',
  TIMEOUT = 'timeout',
  FORM_SUBMISSION = 'form_submission'
}

/**
 * Information about an obstructing element
 */
export interface ObstructingElement {
  tagName: string;
  id: string;
  classList: string[];
  zIndex: string;
  position: string;
}

/**
 * Element state information for diagnostics
 */
export interface ElementState {
  exists: boolean;
  isClickable?: boolean;
  rect?: { x: number, y: number, width: number, height: number };
  style?: {
    display: string;
    visibility: string;
    opacity: string;
    zIndex: string;
    pointerEvents: string;
  };
  isDisabled?: boolean;
  isObscured?: boolean;
  elementAtPoint?: string;
  classList?: string[];
  innerHTML?: string;
  hasClickHandler?: boolean;
  obstructingElement?: ObstructingElement;
}

/**
 * Configuration for the error diagnostics system
 */
export interface DiagnosticsConfig {
  captureScreenshots: boolean;
  screenshotDir: string;
  verboseLogging: boolean;
  maxRetries: number;
  retryDelay: number;
}

/**
 * Type definition for TestHelpers class to fix TypeScript errors
 * This declaration file ensures that all public methods are properly typed
 */
export class TestHelpers {
  constructor(page: Page, config?: Partial<DiagnosticsConfig>);
  
  // Navigation methods
  navigateTo(url: string): Promise<TestResult>;
  waitForLoad(): Promise<void>;
  waitForNavigation(expectedUrl?: string, timeout?: number): Promise<TestResult>;
  waitAdaptively(timeMs: number): Promise<void>;
  
  // Element interaction methods
  clickElement(selector: string, options?: { timeout?: number, retries?: number, category?: ErrorCategory }): Promise<TestResult>;
  typeText(selector: string, text: string, options?: { clear?: boolean; delay?: number }): Promise<TestResult>;
  selectOption(selector: string, value: string): Promise<TestResult>;
  checkCheckbox(selector: string, checked?: boolean): Promise<TestResult>;
  hover(selector: string): Promise<TestResult>;
  pressKey(key: string): Promise<TestResult>;
  clearInput(selector: string): Promise<TestResult>;
  scrollToElement(selector: string): Promise<void>;
  
  // Form handling methods
  fillForm(formData: Record<string, string>, options?: { modalContext?: boolean }): Promise<TestResult[]>;
  submitForm(formSelector?: string, options?: { modalContext?: boolean }): Promise<TestResult>;
  
  // Element verification methods
  elementExists(selector: string, timeout?: number): Promise<boolean>;
  elementVisible(selector: string): Promise<boolean>;
  elementExistsByText(text: string, element?: string, timeout?: number): Promise<boolean>;
  getElementCount(selector: string): Promise<number>;
  getText(selector: string): Promise<string>;
  getValue(selector: string): Promise<string>;
  
  // Element finding methods
  findByText(text: string, element?: string, exact?: boolean): Promise<ElementHandle | null>;
  clickByText(text: string, element?: string, exact?: boolean): Promise<TestResult>;
  
  // Wait helpers
  waitForElement(selector: string, timeout?: number): Promise<TestResult>;
  waitForText(text: string, timeout?: number): Promise<TestResult>;
  waitForModalToAppear(modalSelector?: string, timeout?: number): Promise<TestResult>;
  
  // Authentication methods
  login(email?: string, password?: string): Promise<TestResult>;
  logout(): Promise<TestResult>;
  
  // Diagnostic methods
  takeScreenshot(name: string): Promise<string>;
  getElementState(selector: string): Promise<ElementState>;
  diagnoseModalState(modalSelector?: string): Promise<TestResult>;
  
  // Feature-specific methods
  createWorkspace(workspaceData: {
    name: string;
    description?: string;
    color?: string;
  }): Promise<TestResult>;
  
  createTask(taskData: {
    title: string;
    description?: string;
    priority?: string;
    status?: string;
    workspaceId?: string;
    dueDate?: string;
  }): Promise<TestResult>;
  
  uploadFile(filePath: string, workspaceId?: string): Promise<TestResult>;
  createCompleteWorkflow(data: {
    workspaceName: string;
    taskTitle: string;
    filePath?: string;
  }): Promise<TestResult>;
}

/**
 * Test pattern functions for common test operations
 */
export const testPatterns: {
  /**
   * Tests modal interaction with a simpler pattern that only uses public methods
   */
  testModalInteractionSimple: (
    helpers: TestHelpers,
    triggerSelector: string,
    modalSelector: string,
    actions: () => Promise<TestResult>
  ) => Promise<TestResult>;

  /**
   * Tests a full modal interaction including opening and validation
   */
  testModalInteraction: (
    helpers: TestHelpers,
    triggerSelector: string,
    modalSelector: string,
    formActions: () => Promise<TestResult>,
    validationFn?: () => Promise<boolean>
  ) => Promise<TestResult>;

  /**
   * Tests form validation behavior
   */
  testFormValidation: (
    helpers: TestHelpers,
    formSelector: string,
    errorSelector: string,
    submitAction: () => Promise<TestResult>
  ) => Promise<TestResult>;

  /**
   * Tests searching functionality
   */
  testSearch: (
    helpers: TestHelpers,
    searchInputSelector: string,
    resultsSelector: string,
    searchTerm: string
  ) => Promise<TestResult>;
};

/**
 * Helper function to generate test data
 */
export function generateTestData(): {
  title: string;
  description: string;
  priority: string;
  status: string;
  dueDate: string;
};