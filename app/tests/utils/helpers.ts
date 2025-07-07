import { Page } from 'puppeteer';
import { config } from '../e2e/setup';
import { AUTH_SELECTORS, TASK_SELECTORS, WORKSPACE_SELECTORS, FILE_SELECTORS } from './selectors';
import * as fs from 'fs';
import * as path from 'path';

// Error categorization system
export enum ErrorCategory {
  NAVIGATION = 'navigation',
  ELEMENT_NOT_FOUND = 'element_not_found',
  ELEMENT_NOT_INTERACTABLE = 'element_not_interactable',
  ELEMENT_OBSCURED = 'element_obscured',
  FORM_SUBMISSION = 'form_submission',
  MODAL_INTERACTION = 'modal_interaction',
  TIMEOUT = 'timeout',
  ASSERTION = 'assertion',
  AUTHENTICATION = 'authentication',
  UNKNOWN = 'unknown'
}

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
}

export interface TestResult {
  success: boolean;
  message: string;
  details?: string | Record<string, unknown>;
  screenshot?: string;
  errorCategory?: ErrorCategory;
  elementState?: ElementState;
  timestamp?: number;
  pagePath?: string;
}

// DOM context structure definition
export interface DOMContext {
  parents: Array<{
    tagName: string;
    id: string;
    classList: string[];
    childrenCount: number;
  }>;
  siblings: Array<{
    tagName: string;
    id: string;
    classList: string[];
    isVisible: boolean;
  }>;
  modalInfo: Array<{
    id: string;
    classList: string[];
    isVisible: boolean;
    zIndex: string;
  }>;
  isInModal: boolean;
}

// Configuration for the error diagnostics system
export interface DiagnosticsConfig {
  captureScreenshots: boolean;
  screenshotDir: string;
  verboseLogging: boolean;
  maxRetries: number;
  retryDelay: number;
}

// Default diagnostics configuration
const defaultDiagnosticsConfig: DiagnosticsConfig = {
  captureScreenshots: true,
  screenshotDir: './test-diagnostics',
  verboseLogging: true,
  maxRetries: 3,
  retryDelay: 500
};

export class TestHelpers {
  private diagnosticsConfig: DiagnosticsConfig;
  private testRunId: string;
  
  constructor(private page: Page, config?: Partial<DiagnosticsConfig>) {
    this.diagnosticsConfig = { ...defaultDiagnosticsConfig, ...config };
    this.testRunId = `run-${Date.now()}`;
    
    // Ensure screenshot directory exists
    if (this.diagnosticsConfig.captureScreenshots) {
      this.ensureDirectoryExists(this.diagnosticsConfig.screenshotDir);
    }
  }
  
  // Utility to ensure directory exists for screenshots
  private ensureDirectoryExists(dir: string): void {
    try {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    } catch (error) {
      console.warn(`Failed to create directory ${dir}:`, error);
    }
  }
  
  // Capture diagnostic screenshot with metadata
  private async captureScreenshot(name: string, fullPage = true): Promise<string> {
    if (!this.diagnosticsConfig.captureScreenshots) return '';
    
    try {
      const timestamp = Date.now();
      const filename = `${name}-${timestamp}.png`;
      const filePath = path.join(this.diagnosticsConfig.screenshotDir, filename);
      
      await this.page.screenshot({
        path: filePath as `${string}.png`,
        fullPage
      });
      
      // Save metadata alongside screenshot
      const metadata = {
        timestamp,
        url: this.page.url(),
        viewport: await this.page.viewport(),
        userAgent: await this.page.evaluate(() => navigator.userAgent),
        testRunId: this.testRunId
      };
      
      fs.writeFileSync(
        path.join(this.diagnosticsConfig.screenshotDir, `${name}-${timestamp}-meta.json`),
        JSON.stringify(metadata, null, 2)
      );
      
      return filePath;
    } catch (error) {
      console.warn('Failed to capture screenshot:', error);
      return '';
    }
  }

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
        details: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error)
      };
    }
  }

  async waitForLoad(): Promise<void> {
    await this.page.waitForNavigation({ waitUntil: 'networkidle0' });
    await new Promise(resolve => setTimeout(resolve, 1000)); // Additional buffer
  }

  // Enhanced element interaction helpers with comprehensive diagnostics
  async clickElement(selector: string, options?: { timeout?: number, retries?: number, category?: ErrorCategory }): Promise<TestResult> {
    const timestamp = Date.now();
    const screenshotBaseName = `click-${selector.replace(/[^a-zA-Z0-9]/g, '-')}`;
    let errorCategory = options?.category || ErrorCategory.ELEMENT_NOT_INTERACTABLE;
    
    try {
      if (this.diagnosticsConfig.verboseLogging) {
        console.log(`🎯 Attempting to click: ${selector}`);
      }
      
      // Pre-click screenshot to capture state before interaction
      if (this.diagnosticsConfig.captureScreenshots) {
        await this.captureScreenshot(`${screenshotBaseName}-before`, true);
      }
      
      // Wait for element to exist with visible check
      try {
        await this.page.waitForSelector(selector, {
          visible: true,
          timeout: options?.timeout || config.timeout
        });
      } catch (waitError) {
        errorCategory = ErrorCategory.ELEMENT_NOT_FOUND;
        throw waitError;
      }
      
      // Enhanced clickability check with detailed diagnostics and obstruction detection
      const elementInfo = await this.getElementState(selector);
      
      if (!elementInfo.exists) {
        const screenshotPath = await this.captureScreenshot(`${screenshotBaseName}-not-found`);
        return {
          success: false,
          message: `Element not found: ${selector}`,
          errorCategory: ErrorCategory.ELEMENT_NOT_FOUND,
          elementState: elementInfo,
          timestamp,
          screenshot: screenshotPath,
          pagePath: this.page.url()
        };
      }
      
      if (!elementInfo.isClickable) {
        // Enhanced diagnostics for why element is not clickable
        let specificReason = "Element is not clickable";
        
        if (elementInfo.isDisabled) {
          specificReason = "Element is disabled";
          errorCategory = ErrorCategory.ELEMENT_NOT_INTERACTABLE;
        } else if (elementInfo.isObscured) {
          specificReason = `Element is obscured by ${elementInfo.elementAtPoint}`;
          errorCategory = ErrorCategory.ELEMENT_OBSCURED;
        } else if (elementInfo.style?.display === 'none') {
          specificReason = "Element has display:none";
          errorCategory = ErrorCategory.ELEMENT_NOT_INTERACTABLE;
        } else if (elementInfo.style?.visibility === 'hidden') {
          specificReason = "Element has visibility:hidden";
          errorCategory = ErrorCategory.ELEMENT_NOT_INTERACTABLE;
        } else if (elementInfo.style?.opacity === '0') {
          specificReason = "Element has opacity:0";
          errorCategory = ErrorCategory.ELEMENT_NOT_INTERACTABLE;
        } else if (elementInfo.rect?.width === 0 || elementInfo.rect?.height === 0) {
          specificReason = "Element has zero width or height";
          errorCategory = ErrorCategory.ELEMENT_NOT_INTERACTABLE;
        }
        
        if (this.diagnosticsConfig.verboseLogging) {
          console.log(`❌ ${specificReason}: ${selector}`);
          console.log('Element details:', JSON.stringify(elementInfo, null, 2));
        }
        
        // Capture a diagnostic screenshot with highlighted element
        const screenshotPath = await this.captureScreenshot(`${screenshotBaseName}-not-clickable`);
        
        // Highlight the problematic element for visual debugging
        await this.highlightElement(selector, 'red');
        await this.captureScreenshot(`${screenshotBaseName}-highlighted`);
        
        // Capture DOM context
        const domContext = await this.captureDOMContext(selector);
        
        return {
          success: false,
          message: `${specificReason}: ${selector}`,
          details: { ...elementInfo, domContext },
          errorCategory,
          elementState: elementInfo,
          timestamp,
          screenshot: screenshotPath,
          pagePath: this.page.url()
        };
      }
      
      // Scroll element into view with smooth behavior
      await this.page.evaluate((sel) => {
        const element = document.querySelector(sel);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, selector);
      
      // Wait for scroll and any animations to complete with adaptive timing
      await this.adaptiveWait(800);
      
      // Capture visual state before click
      await this.captureScreenshot(`${screenshotBaseName}-before-click`);
      
      // Attempt to click with retry logic
      let clickAttempts = 0;
      const maxAttempts = options?.retries || this.diagnosticsConfig.maxRetries;
      
      while (clickAttempts < maxAttempts) {
        try {
          await this.page.click(selector);
          break;
        } catch (clickError) {
          clickAttempts++;
          if (clickAttempts >= maxAttempts) {
            // Final attempt - take another screenshot and re-check element state
            const finalElementState = await this.getElementState(selector);
            await this.captureScreenshot(`${screenshotBaseName}-final-attempt-failed`);
            
            // Update error category based on final state check
            if (!finalElementState.exists) {
              errorCategory = ErrorCategory.ELEMENT_NOT_FOUND;
            } else if (finalElementState.isObscured) {
              errorCategory = ErrorCategory.ELEMENT_OBSCURED;
            }
            
            throw new Error(`Click failed after ${maxAttempts} attempts: ${clickError}`);
          }
          
          if (this.diagnosticsConfig.verboseLogging) {
            console.log(`⚠️ Click attempt ${clickAttempts} failed, retrying...`);
          }
          
          // Adaptive waiting between retries
          await this.adaptiveWait(this.diagnosticsConfig.retryDelay);
          
          // Re-check element state on retry
          const retryElementState = await this.getElementState(selector);
          if (!retryElementState.isClickable) {
            // Element became unclickable during retry attempts
            await this.captureScreenshot(`${screenshotBaseName}-retry-${clickAttempts}-state-changed`);
          }
        }
      }
      
      // Wait for any post-click effects with adaptive timing
      await this.adaptiveWait(500);
      
      // Capture post-click state
      await this.captureScreenshot(`${screenshotBaseName}-after-click`);
      
      if (this.diagnosticsConfig.verboseLogging) {
        console.log(`✅ Successfully clicked: ${selector}`);
      }
      
      return {
        success: true,
        message: `Successfully clicked element: ${selector}`,
        timestamp,
        pagePath: this.page.url()
      };
      
    } catch (error) {
      if (this.diagnosticsConfig.verboseLogging) {
        console.log(`💥 Click failed: ${selector} - ${error instanceof Error ? error.message : String(error)}`);
      }
      
      // Take screenshot on failure with additional DOM context
      const screenshotPath = await this.captureScreenshot(`${screenshotBaseName}-failed`);
      
      // Try to capture DOM structure around the element
      const domContext = await this.captureDOMContext(selector);
      
      return {
        success: false,
        message: `Failed to click element: ${selector}`,
        details: {
          error: error instanceof Error ? error.message : String(error),
          domContext
        },
        errorCategory,
        timestamp,
        screenshot: screenshotPath,
        pagePath: this.page.url()
      };
    }
  }
  
  // Get detailed element state for diagnostics
  async getElementState(selector: string): Promise<ElementState> {
    try {
      return await this.page.evaluate((sel) => {
        const element = document.querySelector(sel);
        if (!element) return { exists: false };
        
        const rect = element.getBoundingClientRect();
        const style = window.getComputedStyle(element);
        
        // Check if element is disabled (for form elements)
        const isDisabled = element instanceof HTMLInputElement ||
                           element instanceof HTMLButtonElement ||
                           element instanceof HTMLSelectElement ||
                           element instanceof HTMLTextAreaElement
                           ? element.disabled
                           : false;
        
        // Check for overlapping elements with details about the obstruction
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const elementAtPoint = document.elementFromPoint(centerX, centerY);
        const isObscured = elementAtPoint !== element && !element.contains(elementAtPoint);
        
        // Get detailed information about the obstructing element
        let obstructingElement = null;
        if (isObscured && elementAtPoint) {
          const obstructingStyle = window.getComputedStyle(elementAtPoint);
          obstructingElement = {
            tagName: elementAtPoint.tagName,
            id: elementAtPoint.id,
            classList: Array.from(elementAtPoint.classList),
            zIndex: obstructingStyle.zIndex,
            position: obstructingStyle.position
          };
        }
        
        // Analyze event listeners (approximate method)
        const hasClickHandler = (element as HTMLElement).onclick !== null ||
                               element.getAttribute('onclick') !== null ||
                               element.tagName === 'BUTTON' ||
                               element.tagName === 'A';
        
        const isClickable = rect.width > 0 &&
               rect.height > 0 &&
               style.display !== 'none' &&
               style.visibility !== 'hidden' &&
               style.opacity !== '0' &&
               !isDisabled &&
               !isObscured;
        
        return {
          exists: true,
          isClickable,
          rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
          style: {
            display: style.display,
            visibility: style.visibility,
            opacity: style.opacity,
            zIndex: style.zIndex,
            pointerEvents: style.pointerEvents
          },
          isDisabled,
          isObscured,
          elementAtPoint: elementAtPoint?.tagName || 'none',
          classList: Array.from(element.classList),
          innerHTML: element.innerHTML.substring(0, 100),
          hasClickHandler,
          obstructingElement
        };
      }, selector);
    } catch (error) {
      return { exists: false };
    }
  }
  
  // Highlight an element for debugging purposes
  async highlightElement(selector: string, color = 'red'): Promise<void> {
    try {
      await this.page.evaluate((sel, highlightColor) => {
        const element = document.querySelector(sel) as HTMLElement;
        if (element && element.style) {
          // Save original styles
          const originalBorder = element.style.border;
          const originalBg = element.style.backgroundColor;
          
          // Apply highlight
          element.style.border = `3px solid ${highlightColor}`;
          element.style.backgroundColor = `${highlightColor}33`; // 20% opacity
          
          // Restore after 2 seconds
          setTimeout(() => {
            element.style.border = originalBorder;
            element.style.backgroundColor = originalBg;
          }, 2000);
        }
      }, selector, color);
    } catch (error) {
      // Silently fail - this is just for debugging
    }
  }
  
  // Capture DOM context around an element
  // DOM context structure definition
  interface DOMContext {
    parents: Array<{
      tagName: string;
      id: string;
      classList: string[];
      childrenCount: number;
    }>;
    siblings: Array<{
      tagName: string;
      id: string;
      classList: string[];
      isVisible: boolean;
    }>;
    modalInfo: Array<{
      id: string;
      classList: string[];
      isVisible: boolean;
      zIndex: string;
    }>;
    isInModal: boolean;
  }
  
  async captureDOMContext(selector: string): Promise<DOMContext | null> {
    try {
      return await this.page.evaluate((sel) => {
        const element = document.querySelector(sel);
        if (!element) return null;
        
        // Get parent hierarchy
        const parents = [];
        let currentEl = element.parentElement;
        let depth = 0;
        const maxDepth = 3; // Limit the depth to avoid too much data
        
        while (currentEl && depth < maxDepth) {
          parents.push({
            tagName: currentEl.tagName,
            id: currentEl.id,
            classList: Array.from(currentEl.classList),
            childrenCount: currentEl.children.length
          });
          currentEl = currentEl.parentElement;
          depth++;
        }
        
        // Get siblings
        const siblings = [];
        if (element.parentElement) {
          const children = element.parentElement.children;
          for (let i = 0; i < Math.min(children.length, 5); i++) { // Limit to 5 siblings
            const child = children[i];
            if (child !== element) {
              siblings.push({
                tagName: child.tagName,
                id: child.id,
                classList: Array.from(child.classList),
                isVisible: getComputedStyle(child).display !== 'none'
              });
            }
          }
        }
        
        // Get modal state if applicable
        const modals = document.querySelectorAll('[role="dialog"], .modal, .dialog');
        const modalInfo = Array.from(modals).map(modal => ({
          id: (modal as Element).id,
          classList: Array.from((modal as Element).classList),
          isVisible: getComputedStyle(modal as Element).display !== 'none',
          zIndex: getComputedStyle(modal as Element).zIndex
        }));
        
        return {
          parents,
          siblings,
          modalInfo,
          isInModal: parents.some(p =>
            p.classList.includes('modal') ||
            (p.id && p.id.includes('modal'))
          )
        };
      }, selector);
    } catch (error) {
      return null;
    }
  }
  
  // Adaptive wait with system stability check
  async adaptiveWait(baseTime: number): Promise<void> {
    const startTime = Date.now();
    
    // Base wait
    await new Promise(resolve => setTimeout(resolve, baseTime));
    
    // Check for ongoing network activity
    const isNetworkBusy = await this.page.evaluate(() => {
      // Check for fetch/XHR in progress - note this is an approximation
      return !!document.querySelector('.loading, .spinner, .progress') ||
             document.readyState !== 'complete';
    });
    
    // Add additional wait time if network is busy
    if (isNetworkBusy) {
      if (this.diagnosticsConfig.verboseLogging) {
        console.log('⏳ Network activity detected, extending wait time...');
      }
      await new Promise(resolve => setTimeout(resolve, baseTime));
    }
    
    // Check for animations
    const hasAnimations = await this.page.evaluate(() => {
      const animatingElements = document.getAnimations ?
        document.getAnimations() :
        Array.from(document.querySelectorAll('*')).filter(el => {
          const style = window.getComputedStyle(el);
          return style.animation !== 'none' || style.transition !== 'none';
        });
      return animatingElements.length > 0;
    });
    
    // Add additional wait time if animations are running
    if (hasAnimations) {
      if (this.diagnosticsConfig.verboseLogging) {
        console.log('⏳ Animations detected, extending wait time...');
      }
      await new Promise(resolve => setTimeout(resolve, baseTime / 2));
    }
    
    const totalWaitTime = Date.now() - startTime;
    if (this.diagnosticsConfig.verboseLogging && totalWaitTime > baseTime * 1.5) {
      console.log(`⏱️ Adaptive wait extended to ${totalWaitTime}ms (base: ${baseTime}ms)`);
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
        details: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error)
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
        details: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error)
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
        details: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error)
      };
    }
  }

  // Enhanced form helpers with modal interaction diagnostics
  async fillForm(formData: Record<string, string>, options?: { modalContext?: boolean }): Promise<TestResult[]> {
    const results: TestResult[] = [];
    const isModal = options?.modalContext || false;
    
    // Capture initial form state
    if (this.diagnosticsConfig.captureScreenshots) {
      await this.captureScreenshot(`form-before-fill${isModal ? '-modal' : ''}`);
    }
    
    // For modals, verify the modal is visible and active
    if (isModal) {
      const modalState = await this.page.evaluate(() => {
        const modals = document.querySelectorAll('[role="dialog"], .modal, .dialog');
        return Array.from(modals).map(modal => ({
          id: (modal as Element).id,
          classList: Array.from((modal as Element).classList),
          isVisible: getComputedStyle(modal as Element).display !== 'none',
          zIndex: getComputedStyle(modal as Element).zIndex
        }));
      });
      
      if (modalState.length === 0 || !modalState.some(m => m.isVisible)) {
        results.push({
          success: false,
          message: 'Modal not visible when attempting to fill form',
          errorCategory: ErrorCategory.MODAL_INTERACTION,
          details: { modalState },
          timestamp: Date.now()
        });
        return results;
      }
    }
    
    for (const [selector, value] of Object.entries(formData)) {
      // Verify input field is within modal if in modal context
      if (isModal) {
        const isInModal = await this.page.evaluate((sel) => {
          const element = document.querySelector(sel);
          if (!element) return false;
          
          // Check if element is within a modal
          let current = element;
          while (current.parentElement) {
            current = current.parentElement;
            if (current.getAttribute('role') === 'dialog' ||
                current.classList.contains('modal') ||
                current.classList.contains('dialog')) {
              return true;
            }
          }
          return false;
        }, selector);
        
        if (!isInModal) {
          results.push({
            success: false,
            message: `Form field ${selector} is not within modal`,
            errorCategory: ErrorCategory.MODAL_INTERACTION,
            timestamp: Date.now()
          });
          continue;
        }
      }
      
      const result = await this.typeText(selector, value);
      results.push(result);
      
      // Take a screenshot after each field to help debug form filling
      if (this.diagnosticsConfig.captureScreenshots) {
        const fieldName = selector.replace(/[^a-zA-Z0-9]/g, '-');
        await this.captureScreenshot(`form-fill-${fieldName}`);
      }
      
      if (!result.success) {
        break; // Stop on first error
      }
    }
    
    // Final form state
    if (this.diagnosticsConfig.captureScreenshots) {
      await this.captureScreenshot(`form-after-fill${isModal ? '-modal' : ''}`);
    }
    
    return results;
  }

  async submitForm(formSelector?: string, options?: { modalContext?: boolean }): Promise<TestResult> {
    const timestamp = Date.now();
    const isModal = options?.modalContext || false;
    
    try {
      // For modals, do extra validation
      if (isModal) {
        // Capture pre-submit state for diagnostics
        await this.captureScreenshot('modal-form-before-submit');
        
        // Verify modal is still visible before submitting
        const modalVisible = await this.page.evaluate(() => {
          const modals = document.querySelectorAll('[role="dialog"], .modal, .dialog');
          return Array.from(modals).some(modal =>
            getComputedStyle(modal as Element).display !== 'none'
          );
        });
        
        if (!modalVisible) {
          return {
            success: false,
            message: 'Modal not visible when attempting to submit form',
            errorCategory: ErrorCategory.MODAL_INTERACTION,
            timestamp,
            pagePath: this.page.url()
          };
        }
      }
      
      const selector = formSelector || 'button[type="submit"]';
      
      // Check if submit button is active
      const buttonState = await this.getElementState(selector);
      if (!buttonState.exists) {
        return {
          success: false,
          message: `Submit button not found: ${selector}`,
          errorCategory: ErrorCategory.ELEMENT_NOT_FOUND,
          timestamp,
          pagePath: this.page.url()
        };
      }
      
      if (!buttonState.isClickable) {
        return {
          success: false,
          message: `Submit button not clickable: ${selector}`,
          errorCategory: ErrorCategory.ELEMENT_NOT_INTERACTABLE,
          elementState: buttonState,
          timestamp,
          pagePath: this.page.url()
        };
      }
      
      // Click the submit button with enhanced diagnostics
      const clickResult = await this.clickElement(selector, {
        category: ErrorCategory.FORM_SUBMISSION
      });
      
      if (!clickResult.success) {
        return clickResult;
      }
      
      // Wait for form submission with adaptive timing
      await this.adaptiveWait(2000);
      
      // Verify form submission effects
      if (isModal) {
        // For modal forms, check if modal has closed
        const modalClosed = await this.page.evaluate(() => {
          const modals = document.querySelectorAll('[role="dialog"], .modal, .dialog');
          return Array.from(modals).every(modal =>
            getComputedStyle(modal as Element).display === 'none'
          );
        });
        
        // Capture post-submit state
        await this.captureScreenshot('modal-form-after-submit');
        
        if (!modalClosed) {
          // Check for validation errors
          const hasErrors = await this.page.evaluate(() => {
            return !!document.querySelector('.error, .invalid-feedback, [aria-invalid="true"]');
          });
          
          if (hasErrors) {
            return {
              success: false,
              message: 'Form submission failed due to validation errors',
              errorCategory: ErrorCategory.FORM_SUBMISSION,
              timestamp,
              pagePath: this.page.url()
            };
          }
        }
      }
      
      return {
        success: true,
        message: `Successfully submitted form`,
        timestamp,
        pagePath: this.page.url()
      };
    } catch (error) {
      // Capture state on error
      await this.captureScreenshot('form-submit-error');
      
      return {
        success: false,
        message: `Failed to submit form`,
        details: error instanceof Error ? error.message : String(error),
        errorCategory: ErrorCategory.FORM_SUBMISSION,
        timestamp,
        pagePath: this.page.url()
      };
    }
  }

  // Text-based element finding (Puppeteer compatible)
  async findByText(text: string, element: string = '*', exact: boolean = false): Promise<import('puppeteer').ElementHandle | null> {
    try {
      const handle = await this.page.evaluateHandle((searchText, elementType, isExact) => {
        const elements = Array.from(document.querySelectorAll(elementType));
        return elements.find(el => {
          const textContent = el.textContent?.trim() || '';
          return isExact ? textContent === searchText : textContent.includes(searchText);
        }) || null;
      }, text, element, exact);
      
      // Check if we got an ElementHandle or null
      const element_handle = handle.asElement();
      if (element_handle) {
        return element_handle as import('puppeteer').ElementHandle;
      } else {
        await handle.dispose();
        return null;
      }
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
        details: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error)
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
        details: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error)
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
        details: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error)
      };
    }
  }
  
  // Public method to expose capturing screenshots
  async takeScreenshot(name: string): Promise<string> {
    return this.captureScreenshot(name);
  }
  
  // Public method to expose adaptive waiting
  async waitAdaptively(timeMs: number): Promise<void> {
    return this.adaptiveWait(timeMs);
  }

  async waitForNavigation(expectedUrl?: string, timeout: number = 5000): Promise<TestResult> {
    // Store timeout for potential use in error messages
    const navigationTimeout = timeout;
    try {
      // Wait for navigation with proper timeout handling
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
      
      // Add page-specific wait conditions
      await this.waitForPageLoad(expectedUrl);
      
      return {
        success: true,
        message: `Navigation completed successfully`
      };
    } catch (error) {
      return {
        success: false,
        message: `Navigation timeout`,
        details: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error)
      };
    }
  }

  /**
   * Enhanced page-specific wait implementation with comprehensive diagnostics
   */
  private async waitForPageLoad(expectedUrl?: string): Promise<void> {
    if (!expectedUrl) return;

    try {
      const pageType = this.determinePageType(expectedUrl);
      if (this.diagnosticsConfig.verboseLogging) {
        console.log(`🎯 Waiting for ${pageType} page elements to load...`);
      }
      
      // Capture initial page state
      await this.captureScreenshot(`${pageType}-page-initial`);
      
      // Detect loading indicators and wait for them to disappear
      const loadingIndicators = [
        '.loading',
        '.spinner',
        '[role="progressbar"]',
        '.skeleton',
        '[data-loading="true"]'
      ];
      
      const hasLoadingIndicators = await this.page.evaluate((indicators) => {
        return indicators.some(selector =>
          document.querySelector(selector) !== null
        );
      }, loadingIndicators);
      
      if (hasLoadingIndicators) {
        if (this.diagnosticsConfig.verboseLogging) {
          console.log('⏳ Waiting for loading indicators to disappear...');
        }
        
        // Wait for all loading indicators to disappear with timeout
        try {
          await this.page.waitForFunction(
            (indicators) => !indicators.some(selector =>
              document.querySelector(selector) !== null
            ),
            { timeout: 10000 },
            loadingIndicators
          );
        } catch (e) {
          console.warn('⚠️ Loading indicators did not disappear within timeout');
          await this.captureScreenshot(`${pageType}-loading-indicators-timeout`);
        }
      }
      
      // Tasks page specific waits
      if (expectedUrl.includes('/dashboard/tasks')) {
        // Wait for the main container and create task button with fallbacks
        const taskSelectors = [
          '[data-testid="tasks-container"]',
          '.tasks-page',
          'main'
        ];
        
        await this.waitForAnySelector(taskSelectors, {
          timeout: 10000,
          visible: true
        });
        
        // Capture state after container loaded
        await this.captureScreenshot('tasks-page-container-loaded');
        
        // Wait for create task button with fallbacks
        const buttonSelectors = [
          '[data-testid="create-task"]',
          'button:has-text("Create Task")',
          'button:has-text("New Task")',
          'button.create-task-btn',
          'button.new-task-btn'
        ];
        
        await this.waitForAnySelector(buttonSelectors, {
          timeout: 10000,
          visible: true
        });
        
        // More comprehensive button readiness check
        await this.page.waitForFunction(() => {
          // Try multiple potential button selectors
          const selectors = [
            '[data-testid="create-task"]',
            'button:has-text("Create Task")',
            'button:has-text("New Task")',
            'button.create-task-btn',
            'button.new-task-btn'
          ];
          
          for (const sel of selectors) {
            const button = document.querySelector(sel) as HTMLButtonElement;
            if (button &&
                !button.disabled &&
                getComputedStyle(button).display !== 'none' &&
                getComputedStyle(button).visibility !== 'hidden') {
              return true;
            }
          }
          return false;
        }, { timeout: 5000 });
        
        // Capture final state
        await this.captureScreenshot('tasks-page-ready');
      }
      
      // Workspaces page specific waits
      else if (expectedUrl.includes('/dashboard/workspaces')) {
        const workspaceSelectors = [
          '[data-testid="create-workspace"]',
          '.create-workspace-btn',
          'button:has-text("Create Workspace")',
          'button:has-text("New Workspace")'
        ];
        
        await this.waitForAnySelector(workspaceSelectors, {
          timeout: 10000,
          visible: true
        });
        
        await this.captureScreenshot('workspaces-page-ready');
      }
      
      // Files page specific waits
      else if (expectedUrl.includes('/dashboard/files')) {
        const fileSelectors = [
          '[data-testid="upload-file"]',
          '.upload-btn',
          'button:has-text("Upload")',
          'button:has-text("Upload File")',
          'input[type="file"]'
        ];
        
        await this.waitForAnySelector(fileSelectors, {
          timeout: 10000,
          visible: true
        });
        
        await this.captureScreenshot('files-page-ready');
      }
      
      // Generic dashboard wait
      else if (expectedUrl.includes('/dashboard')) {
        const dashboardSelectors = [
          'nav',
          '.navigation',
          '[role="navigation"]',
          '.sidebar',
          '.dashboard-layout'
        ];
        
        await this.waitForAnySelector(dashboardSelectors, {
          timeout: 10000,
          visible: true
        });
        
        await this.captureScreenshot('dashboard-page-ready');
      }
      
      if (this.diagnosticsConfig.verboseLogging) {
        console.log(`✅ ${pageType} page elements are ready`);
      }
      
    } catch (error) {
      console.warn(`⚠️ Page-specific wait failed for ${expectedUrl}:`, error);
      await this.captureScreenshot(`page-wait-failed-${Date.now()}`);
      // Don't throw - continue with test execution
    }
  }
  
  // Helper to determine page type from URL
  private determinePageType(url: string): string {
    if (url.includes('/dashboard/tasks')) return 'tasks';
    if (url.includes('/dashboard/workspaces')) return 'workspaces';
    if (url.includes('/dashboard/files')) return 'files';
    if (url.includes('/dashboard')) return 'dashboard';
    if (url.includes('/login')) return 'login';
    return 'generic';
  }
  
  // Wait for any of the provided selectors
  private async waitForAnySelector(selectors: string[], options?: { timeout?: number, visible?: boolean }): Promise<string | null> {
    const timeout = options?.timeout || 5000;
    const visible = options?.visible ?? true;
    
    try {
      return await this.page.evaluate(async (sels, shouldBeVisible, maxTime) => {
        return new Promise<string | null>((resolve) => {
          const startTime = Date.now();
          
          const check = () => {
            for (const selector of sels) {
              const element = document.querySelector(selector);
              if (!element) continue;
              
              if (shouldBeVisible) {
                const style = window.getComputedStyle(element);
                if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
                  continue;
                }
                
                // Check if element is in viewport
                const rect = element.getBoundingClientRect();
                if (rect.width === 0 || rect.height === 0) {
                  continue;
                }
              }
              
              resolve(selector);
              return;
            }
            
            // Check timeout
            if (Date.now() - startTime >= maxTime) {
              resolve(null);
              return;
            }
            
            // Try again in 100ms
            setTimeout(check, 100);
          };
          
          check();
        });
      }, selectors, visible, timeout);
    } catch (error) {
      return null;
    }
  }
  
  // Enhanced modal interaction helpers
  async waitForModalToAppear(modalSelector: string = '[role="dialog"], .modal, dialog', timeout: number = 5000): Promise<TestResult> {
    // Track start time for diagnostics
    const startTimestamp = Date.now();
    try {
      // Take before screenshot
      await this.captureScreenshot('before-modal-wait');
      
      // Wait for modal with a specific timeout
      await this.page.waitForSelector(modalSelector, {
        visible: true,
        timeout
      });
      
      // Verify modal is fully interactive
      const modalState = await this.page.evaluate((selector) => {
        const modal = document.querySelector(selector);
        if (!modal) return { exists: false };
        
        const style = window.getComputedStyle(modal);
        const rect = modal.getBoundingClientRect();
        
        // Check for common modal readiness indicators
        const hasBackdrop = !!document.querySelector('.modal-backdrop, .backdrop, .overlay');
        const isAnimating = style.animation !== 'none' || style.transition !== 'none';
        
        return {
          exists: true,
          isVisible: style.display !== 'none' && style.visibility !== 'hidden',
          zIndex: style.zIndex,
          isAnimating,
          hasBackdrop,
          dimensions: {
            width: rect.width,
            height: rect.height
          }
        };
      }, modalSelector);
      
      // Take after screenshot
      await this.captureScreenshot('modal-appeared');
      
      if (!modalState.exists || !modalState.isVisible) {
        return {
          success: false,
          message: 'Modal exists but is not visible',
          errorCategory: ErrorCategory.MODAL_INTERACTION,
          details: modalState,
          timestamp: Date.now()
        };
      }
      
      // If modal is still animating, wait a bit longer
      if (modalState.isAnimating) {
        await this.adaptiveWait(500);
        await this.captureScreenshot('modal-after-animation');
      }
      
      return {
        success: true,
        message: 'Modal is visible and ready for interaction',
        details: modalState,
        timestamp: Date.now()
      };
    } catch (error) {
      // Take error screenshot
      await this.captureScreenshot('modal-wait-failed');
      
      return {
        success: false,
        message: `Modal did not appear within ${timeout}ms`,
        details: error instanceof Error ? error.message : String(error),
        errorCategory: ErrorCategory.MODAL_INTERACTION,
        timestamp: Date.now(),
        pagePath: this.page.url()
      };
    }
  }
  
  /**
   * Verifies the state of a modal and diagnoses common modal issues
   * This is particularly helpful for diagnosing modal interaction failures
   */
  async diagnoseModalState(modalSelector: string = '[role="dialog"], .modal, dialog'): Promise<TestResult> {
    try {
      // Take screenshot for visual debugging
      await this.captureScreenshot('modal-diagnosis');
      
      // Comprehensive modal state analysis
      const modalDiagnosis = await this.page.evaluate((selector) => {
        // Find all potential modals
        const allModals = document.querySelectorAll(selector);
        const modalCount = allModals.length;
        
        // Get active modal (if any)
        const modalList = Array.from(allModals);
        const visibleModals = modalList.filter(modal => {
          const style = window.getComputedStyle(modal);
          return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
        });
        
        // Analyze focus state
        const activeElement = document.activeElement;
        const isModalFocused = visibleModals.some(modal =>
          modal === activeElement || modal.contains(activeElement)
        );
        
        // Analyze potential interaction blockers
        const interactionBlockers = [];
        
        // Check if body has modal open class
        const bodyHasModalClass = document.body.classList.contains('modal-open') ||
                                 document.body.classList.contains('has-modal') ||
                                 document.documentElement.classList.contains('modal-open');
        
        // Check if body has overflow hidden (common modal pattern)
        const bodyStyle = window.getComputedStyle(document.body);
        const bodyOverflowHidden = bodyStyle.overflow === 'hidden';
        
        // Check for backdrop element
        const hasBackdrop = !!document.querySelector('.modal-backdrop, .backdrop, .overlay');
        
        // Check for scrollability
        let isScrollable = false;
        if (visibleModals.length > 0) {
          const modalContent = visibleModals[0].querySelector('.modal-content, .dialog-content');
          if (modalContent) {
            const contentStyle = window.getComputedStyle(modalContent);
            isScrollable = contentStyle.overflow === 'auto' || contentStyle.overflow === 'scroll';
          }
        }
        
        // Analyze focus trap (common in accessible modals)
        const hasFocusTrap = !!document.querySelector('[data-focus-trap], [aria-modal="true"]');
        
        // For any visible modal, check its form elements
        const formElements = visibleModals.length > 0
          ? visibleModals[0].querySelectorAll('input, select, textarea, button')
          : [];
        
        const formElementStates = Array.from(formElements).map(el => {
          const element = el as HTMLElement;
          return {
            type: element.tagName,
            id: element.id,
            name: (element as any).name || '',
            isDisabled: (element as any).disabled || false,
            isVisible: window.getComputedStyle(element).display !== 'none',
            hasValidationError: element.classList.contains('is-invalid') ||
                               !!element.getAttribute('aria-invalid') === true ||
                               element.closest('.has-error, .invalid-feedback') !== null
          };
        });
        
        return {
          modalCount,
          visibleModalCount: visibleModals.length,
          isModalFocused,
          bodyHasModalClass,
          bodyOverflowHidden,
          hasBackdrop,
          isScrollable,
          hasFocusTrap,
          formElementsCount: formElements.length,
          formElementStates: formElementStates.length > 0 ? formElementStates : null,
          potentialIssues: {
            noVisibleModals: visibleModals.length === 0,
            modalNotFocused: visibleModals.length > 0 && !isModalFocused,
            missingBackdrop: visibleModals.length > 0 && !hasBackdrop,
            bodyNotLocked: visibleModals.length > 0 && !bodyOverflowHidden && !bodyHasModalClass,
            formValidationErrors: formElementStates.some(el => el.hasValidationError),
            disabledSubmitButton: formElementStates.some(el =>
              el.type === 'BUTTON' &&
              (el as any).type === 'submit' &&
              el.isDisabled
            )
          }
        };
      }, modalSelector);
      
      // Create a readable summary of issues
      const issues = modalDiagnosis.potentialIssues;
      const issueMessages = [];
      
      if (issues.noVisibleModals) {
        issueMessages.push('No visible modals found');
      }
      
      if (issues.modalNotFocused) {
        issueMessages.push('Modal is not focused (focus trap may not be working)');
      }
      
      if (issues.missingBackdrop) {
        issueMessages.push('Modal is missing backdrop (may allow interactions with background elements)');
      }
      
      if (issues.bodyNotLocked) {
        issueMessages.push('Body is not locked (possible scroll issues)');
      }
      
      if (issues.formValidationErrors) {
        issueMessages.push('Form has validation errors');
      }
      
      if (issues.disabledSubmitButton) {
        issueMessages.push('Submit button is disabled');
      }
      
      // Determine overall state
      const hasErrors = issueMessages.length > 0;
      
      return {
        success: !hasErrors,
        message: hasErrors
          ? `Modal has ${issueMessages.length} potential issues`
          : 'Modal appears to be functioning correctly',
        details: {
          diagnosis: modalDiagnosis,
          issues: issueMessages
        },
        errorCategory: hasErrors ? ErrorCategory.MODAL_INTERACTION : undefined,
        timestamp: Date.now(),
        pagePath: this.page.url()
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to diagnose modal state',
        details: error instanceof Error ? error.message : String(error),
        errorCategory: ErrorCategory.MODAL_INTERACTION,
        timestamp: Date.now(),
        pagePath: this.page.url()
      };
    }
  }
  
  /**
   * Verifies the state of a modal and diagnoses common modal issues
   * This is particularly helpful for diagnosing modal interaction failures
   */
  async diagnoseModalState(modalSelector: string = '[role="dialog"], .modal, dialog'): Promise<TestResult> {
    try {
      // Take screenshot for visual debugging
      await this.captureScreenshot('modal-diagnosis');
      
      // Comprehensive modal state analysis
      const modalDiagnosis = await this.page.evaluate((selector) => {
        // Find all potential modals
        const allModals = document.querySelectorAll(selector);
        const modalCount = allModals.length;
        
        // Get active modal (if any)
        const modalList = Array.from(allModals);
        const visibleModals = modalList.filter(modal => {
          const style = window.getComputedStyle(modal);
          return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
        });
        
        // Analyze focus state
        const activeElement = document.activeElement;
        const isModalFocused = visibleModals.some(modal =>
          modal === activeElement || modal.contains(activeElement)
        );
        
        // Analyze potential interaction blockers
        const interactionBlockers = [];
        
        // Check if body has modal open class
        const bodyHasModalClass = document.body.classList.contains('modal-open') ||
                                 document.body.classList.contains('has-modal') ||
                                 document.documentElement.classList.contains('modal-open');
        
        // Check if body has overflow hidden (common modal pattern)
        const bodyStyle = window.getComputedStyle(document.body);
        const bodyOverflowHidden = bodyStyle.overflow === 'hidden';
        
        // Check for backdrop element
        const hasBackdrop = !!document.querySelector('.modal-backdrop, .backdrop, .overlay');
        
        // Check for scrollability
        let isScrollable = false;
        if (visibleModals.length > 0) {
          const modalContent = visibleModals[0].querySelector('.modal-content, .dialog-content');
          if (modalContent) {
            const contentStyle = window.getComputedStyle(modalContent);
            isScrollable = contentStyle.overflow === 'auto' || contentStyle.overflow === 'scroll';
          }
        }
        
        // Analyze focus trap (common in accessible modals)
        const hasFocusTrap = !!document.querySelector('[data-focus-trap], [aria-modal="true"]');
        
        // For any visible modal, check its form elements
        const formElements = visibleModals.length > 0
          ? visibleModals[0].querySelectorAll('input, select, textarea, button')
          : [];
        
        const formElementStates = Array.from(formElements).map(el => {
          const element = el as HTMLElement;
          return {
            type: element.tagName,
            id: element.id,
            name: (element as any).name || '',
            isDisabled: (element as any).disabled || false,
            isVisible: window.getComputedStyle(element).display !== 'none',
            hasValidationError: element.classList.contains('is-invalid') ||
                               !!element.getAttribute('aria-invalid') === true ||
                               element.closest('.has-error, .invalid-feedback') !== null
          };
        });
        
        return {
          modalCount,
          visibleModalCount: visibleModals.length,
          isModalFocused,
          bodyHasModalClass,
          bodyOverflowHidden,
          hasBackdrop,
          isScrollable,
          hasFocusTrap,
          formElementsCount: formElements.length,
          formElementStates: formElementStates.length > 0 ? formElementStates : null,
          potentialIssues: {
            noVisibleModals: visibleModals.length === 0,
            modalNotFocused: visibleModals.length > 0 && !isModalFocused,
            missingBackdrop: visibleModals.length > 0 && !hasBackdrop,
            bodyNotLocked: visibleModals.length > 0 && !bodyOverflowHidden && !bodyHasModalClass,
            formValidationErrors: formElementStates.some(el => el.hasValidationError),
            disabledSubmitButton: formElementStates.some(el =>
              el.type === 'BUTTON' &&
              (el as any).type === 'submit' &&
              el.isDisabled
            )
          }
        };
      }, modalSelector);
      
      // Create a readable summary of issues
      const issues = modalDiagnosis.potentialIssues;
      const issueMessages = [];
      
      if (issues.noVisibleModals) {
        issueMessages.push('No visible modals found');
      }
      
      if (issues.modalNotFocused) {
        issueMessages.push('Modal is not focused (focus trap may not be working)');
      }
      
      if (issues.missingBackdrop) {
        issueMessages.push('Modal is missing backdrop (may allow interactions with background elements)');
      }
      
      if (issues.bodyNotLocked) {
        issueMessages.push('Body is not locked (possible scroll issues)');
      }
      
      if (issues.formValidationErrors) {
        issueMessages.push('Form has validation errors');
      }
      
      if (issues.disabledSubmitButton) {
        issueMessages.push('Submit button is disabled');
      }
      
      // Determine overall state
      const hasErrors = issueMessages.length > 0;
      
      return {
        success: !hasErrors,
        message: hasErrors
          ? `Modal has ${issueMessages.length} potential issues`
          : 'Modal appears to be functioning correctly',
        details: {
          diagnosis: modalDiagnosis,
          issues: issueMessages
        },
        errorCategory: hasErrors ? ErrorCategory.MODAL_INTERACTION : undefined,
        timestamp: Date.now(),
        pagePath: this.page.url()
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to diagnose modal state',
        details: error instanceof Error ? error.message : String(error),
        errorCategory: ErrorCategory.MODAL_INTERACTION,
        timestamp: Date.now(),
        pagePath: this.page.url()
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
      console.log(`🔐 Starting login process for ${credentials.email}`);
      
      // Navigate to login page
      const navResult = await this.navigateTo('/login');
      if (!navResult.success) {
        return { success: false, message: `Failed to navigate to login: ${navResult.message}` };
      }
      console.log('✅ Navigated to login page');

      // Wait for login form to be available
      await this.page.waitForSelector('form', { timeout: 10000 });
      console.log('✅ Login form found');
      
      // Check if elements exist before filling
      const emailExists = await this.elementExists(AUTH_SELECTORS.EMAIL_INPUT);
      const passwordExists = await this.elementExists(AUTH_SELECTORS.PASSWORD_INPUT);
      const buttonExists = await this.elementExists(AUTH_SELECTORS.LOGIN_BUTTON);
      
      console.log(`📧 Email input exists: ${emailExists}`);
      console.log(`🔑 Password input exists: ${passwordExists}`);
      console.log(`🔘 Login button exists: ${buttonExists}`);
      
      if (!emailExists || !passwordExists || !buttonExists) {
        return {
          success: false,
          message: `Missing form elements: email=${emailExists}, password=${passwordExists}, button=${buttonExists}`
        };
      }
      
      // Fill login form with extra wait
      console.log('📝 Filling email field...');
      await this.typeText(AUTH_SELECTORS.EMAIL_INPUT, credentials.email);
      await new Promise(resolve => setTimeout(resolve, 500));
      
      console.log('📝 Filling password field...');
      await this.typeText(AUTH_SELECTORS.PASSWORD_INPUT, credentials.password);
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Get current URL before submit
      const urlBeforeSubmit = this.page.url();
      console.log(`🌐 URL before submit: ${urlBeforeSubmit}`);
      
      // Submit form
      console.log('🚀 Clicking login button...');
      await this.clickElement(AUTH_SELECTORS.LOGIN_BUTTON);
      
      // Wait for navigation or error
      console.log('⏳ Waiting for navigation...');
      await new Promise(resolve => setTimeout(resolve, 3000)); // Give more time for auth
      
      const urlAfterSubmit = this.page.url();
      console.log(`🌐 URL after submit: ${urlAfterSubmit}`);
      
      // Check for dashboard elements more thoroughly
      const dashboardExists = await this.elementExists('[data-testid="dashboard"]');
      const mainExists = await this.elementExists('main');
      const urlContainsDashboard = urlAfterSubmit.includes('/dashboard');
      
      console.log(`🏠 Dashboard element exists: ${dashboardExists}`);
      console.log(`🏠 Main element exists: ${mainExists}`);
      console.log(`🌐 URL contains dashboard: ${urlContainsDashboard}`);
      
      const isDashboard = dashboardExists || mainExists || urlContainsDashboard;
      
      if (isDashboard) {
        console.log('✅ Login successful!');
        return {
          success: true,
          message: `Successfully logged in as ${credentials.email}`
        };
      } else {
        // Check for error messages
        const errorExists = await this.elementExists('[role="alert"], .error-message');
        console.log(`❌ Error message visible: ${errorExists}`);
        
        return {
          success: false,
          message: `Login failed - URL: ${urlAfterSubmit}, Dashboard: ${isDashboard}`,
          details: {
            urlBefore: urlBeforeSubmit,
            urlAfter: urlAfterSubmit,
            dashboardExists,
            mainExists,
            errorExists
          }
        };
      }
    } catch (error) {
      console.log(`💥 Login error: ${error instanceof Error ? error.message : String(error)}`);
      return {
        success: false,
        message: `Login failed with exception`,
        details: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error)
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
        details: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error)
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
        details: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error)
      };
    }
  }

  async pressKey(key: string): Promise<TestResult> {
    try {
      await this.page.keyboard.press(key as import('puppeteer').KeyInput);
      await new Promise(resolve => setTimeout(resolve, 500));
      
      return {
        success: true,
        message: `Successfully pressed key: ${key}`
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to press key: ${key}`,
        details: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error)
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
        details: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error)
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

      // Wait for page to be fully loaded - try multiple selectors separately
      const createButtonSelectors = [
        '[data-testid="create-workspace"]',
        'button[aria-label*="workspace" i]',
        'button'
      ];
      
      let buttonFound = false;
      for (const selector of createButtonSelectors) {
        if (await this.elementExists(selector, 2000)) {
          buttonFound = true;
          break;
        }
      }
      
      if (!buttonFound) {
        return {
          success: false,
          message: 'Create workspace button not found on page'
        };
      }

      // Click create workspace button with multiple fallback selectors
      let createResult = await this.clickElement(WORKSPACE_SELECTORS.CREATE_WORKSPACE_BUTTON);
      
      // If first selector fails, try alternative selectors
      if (!createResult.success) {
        createResult = await this.clickByText('New Workspace', 'button');
      }
      
      if (!createResult.success) {
        // Try to find button by partial text content
        const buttons = await this.page.$$('button');
        for (const button of buttons) {
          const text = await button.evaluate(el => el.textContent);
          if (text && text.includes('New Workspace')) {
            await button.click();
            createResult = { success: true, message: 'Clicked New Workspace button' };
            break;
          }
        }
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
      console.log(`🎯 Starting task creation: ${taskData.title}`);
      
      // Navigate to tasks page with enhanced timing
      const navResult = await this.navigateTo('/dashboard/tasks');
      if (!navResult.success) {
        return {
          success: false,
          message: `Failed to navigate to tasks page: ${navResult.message}`,
          details: navResult.details
        };
      }
      
      // Wait for navigation with page-specific waits
      const waitResult = await this.waitForNavigation('/dashboard/tasks', 15000);
      if (!waitResult.success) {
        return {
          success: false,
          message: `Tasks page not ready: ${waitResult.message}`,
          details: waitResult.details
        };
      }
      
      console.log('✅ Tasks page is ready');

      // Click create task button with enhanced debugging
      console.log('🎯 Attempting to click create task button...');
      const createResult = await this.clickElement(TASK_SELECTORS.CREATE_TASK_BUTTON);
      if (!createResult.success) {
        console.log('❌ Failed to click create task button');
        return {
          success: false,
          message: `Failed to click create task button: ${createResult.message}`,
          details: createResult.details
        };
      }
      
      console.log('✅ Create task button clicked successfully');

      // Wait for task modal to appear
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Wait for modal elements to be ready
      const modalResult = await this.waitForElement('[data-testid="task-modal"], [role="dialog"], .modal');
      if (!modalResult.success) {
        return {
          success: false,
          message: 'Task modal did not appear',
          details: modalResult.details
        };
      }
      
      console.log('✅ Task modal is ready');

      // Fill task form with better error handling
      console.log('📝 Filling task title...');
      const titleResult = await this.typeText(TASK_SELECTORS.TASK_TITLE_INPUT, taskData.title);
      if (!titleResult.success) {
        return {
          success: false,
          message: 'Failed to fill task title',
          details: titleResult.details
        };
      }
      
      if (taskData.description) {
        console.log('📝 Filling task description...');
        const descResult = await this.typeText(TASK_SELECTORS.TASK_DESCRIPTION_INPUT, taskData.description);
        if (!descResult.success) {
          return {
            success: false,
            message: 'Failed to fill task description',
            details: descResult.details
          };
        }
      }

      if (taskData.priority) {
        console.log('📝 Setting task priority...');
        const priorityResult = await this.selectOption(TASK_SELECTORS.TASK_PRIORITY_SELECT, taskData.priority);
        if (!priorityResult.success) {
          return {
            success: false,
            message: 'Failed to set task priority',
            details: priorityResult.details
          };
        }
      }

      if (taskData.status) {
        console.log('📝 Setting task status...');
        const statusResult = await this.selectOption(TASK_SELECTORS.TASK_STATUS_SELECT, taskData.status);
        if (!statusResult.success) {
          return {
            success: false,
            message: 'Failed to set task status',
            details: statusResult.details
          };
        }
      }

      if (taskData.workspaceId) {
        console.log('📝 Setting task workspace...');
        const workspaceResult = await this.selectOption(TASK_SELECTORS.TASK_WORKSPACE_SELECT, taskData.workspaceId);
        if (!workspaceResult.success) {
          return {
            success: false,
            message: 'Failed to set task workspace',
            details: workspaceResult.details
          };
        }
      }

      if (taskData.dueDate) {
        console.log('📝 Setting task due date...');
        const dueDateResult = await this.typeText(TASK_SELECTORS.TASK_DUE_DATE_INPUT, taskData.dueDate);
        if (!dueDateResult.success) {
          return {
            success: false,
            message: 'Failed to set task due date',
            details: dueDateResult.details
          };
        }
      }

      // Submit form with enhanced error handling
      console.log('🚀 Submitting task form...');
      const submitResult = await this.clickElement(TASK_SELECTORS.TASK_SUBMIT_BUTTON);
      if (!submitResult.success) {
        return {
          success: false,
          message: 'Failed to submit task form',
          details: submitResult.details
        };
      }

      // Wait for task creation to complete
      await new Promise(resolve => setTimeout(resolve, 4000));
      
      console.log('✅ Task creation completed');

      return {
        success: true,
        message: `Successfully created task: ${taskData.title}`
      };
    } catch (error) {
      console.log(`💥 Task creation failed: ${error instanceof Error ? error.message : String(error)}`);
      return {
        success: false,
        message: `Failed to create task: ${taskData.title}`,
        details: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error)
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
        await (fileInput as import('puppeteer').ElementHandle<HTMLInputElement>).uploadFile(filePath);
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
        details: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error)
      };
    }
  }
}

// Enhanced Test data generators with consistent IDs for easier debugging
export const generateTestData = {
  workspace: (prefix = 'Test') => {
    const timestamp = Date.now();
    return {
      name: `${prefix} Workspace ${timestamp}`,
      description: `Generated test workspace created at ${new Date().toISOString()}`,
      color: '#3B82F6',
      icon: '🚀',
      id: `ws-${timestamp}`
    };
  },
  
  task: (prefix = 'Test') => {
    const timestamp = Date.now();
    return {
      title: `${prefix} Task ${timestamp}`,
      description: `Generated test task created at ${new Date().toISOString()}`,
      priority: 'medium',
      status: 'pending',
      id: `task-${timestamp}`
    };
  },
  
  user: (prefix = 'Test') => {
    const timestamp = Date.now();
    return {
      name: `${prefix} User ${timestamp}`,
      email: `test-${timestamp}@example.com`,
      bio: `Test user bio generated at ${new Date().toISOString()}`,
      id: `user-${timestamp}`
    };
  },
  
  // New test data generator for diagnostic purposes
  diagnostic: () => ({
    runId: `run-${Date.now()}`,
    timestamp: Date.now(),
    sessionId: `session-${Math.random().toString(36).substring(2, 15)}`
  })
};

// Error logging and reporting utilities
export const errorReporting = {
  // Log error with categorization
  logError: (error: Error | string, category: ErrorCategory, context?: Record<string, unknown>): void => {
    const timestamp = new Date().toISOString();
    const errorMessage = error instanceof Error ? error.message : error;
    const stack = error instanceof Error ? error.stack : '';
    
    console.error(`[${timestamp}] [${category}] Error: ${errorMessage}`);
    if (context) {
      console.error('Context:', JSON.stringify(context, null, 2));
    }
    if (stack) {
      console.error('Stack:', stack);
    }
    
    // Could be extended to report to an error tracking system
  },
  
  // Create diagnostic log bundle
  createDiagnosticBundle: async (testName: string, page: Page, error?: Error): Promise<string> => {
    try {
      const timestamp = Date.now();
      const bundleDir = `./test-diagnostics/bundle-${testName}-${timestamp}`;
      
      if (!fs.existsSync(bundleDir)) {
        fs.mkdirSync(bundleDir, { recursive: true });
      }
      
      // Capture final state screenshot
      await page.screenshot({
        path: `${bundleDir}/final-state.png`,
        fullPage: true
      });
      
      // Save page HTML
      const html = await page.content();
      fs.writeFileSync(`${bundleDir}/page.html`, html);
      
      // Save error details if provided
      if (error) {
        fs.writeFileSync(`${bundleDir}/error.txt`, `${error.message}\n\n${error.stack || ''}`);
      }
      
      // Save console logs
      // Note: This would require capturing console logs during test execution
      
      // Save test metadata
      const metadata = {
        testName,
        timestamp,
        url: page.url(),
        userAgent: await page.evaluate(() => navigator.userAgent),
        viewport: await page.viewport(),
        error: error ? {
          message: error.message,
          stack: error.stack
        } : undefined
      };
      
      fs.writeFileSync(
        `${bundleDir}/metadata.json`,
        JSON.stringify(metadata, null, 2)
      );
      
      return bundleDir;
    } catch (bundleError) {
      console.error('Failed to create diagnostic bundle:', bundleError);
      return '';
    }
  }
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
          details: result.details || result.message
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
  
  /**
   * Enhanced modal interaction testing with comprehensive diagnostics and robust interaction handling
   * @param helpers - TestHelpers instance
   * @param triggerSelector - Selector to trigger/open the modal
   * @param modalSelector - Selector to identify the modal
   * @param actions - Callback function containing actions to perform within the modal
   * @param options - Additional options for modal testing
   */
  async testModalInteraction(
    helpers: TestHelpers,
    triggerSelector: string,
    modalSelector: string,
    actions: () => Promise<TestResult>,
    options?: {
      waitTime?: number;
      retries?: number;
      ensureClosed?: boolean;
      validateBeforeActions?: boolean;
    }
  ): Promise<TestResult> {
    const timestamp = Date.now();
    const waitTime = options?.waitTime || 10000;
    const retries = options?.retries || 2;
    const ensureClosed = options?.ensureClosed !== false; // Default true
    const validateBeforeActions = options?.validateBeforeActions !== false; // Default true
    
    // Add detailed diagnostics for the starting state
    await helpers.captureScreenshot('modal-test-before-trigger');
    
    // Check if modal is already open (could be from a previous test step)
    const initialModalState = await helpers.elementExists(modalSelector);
    if (initialModalState) {
      console.log('⚠️ Modal appears to be already open before triggering it');
      await helpers.captureScreenshot('modal-already-open');
      
      // Try to close it first to start fresh
      try {
        await helpers.page.evaluate((selector) => {
          const closeButtons = document.querySelectorAll(`${selector} button.close, ${selector} [aria-label="Close"], ${selector} .btn-close`);
          if (closeButtons.length > 0) {
            (closeButtons[0] as HTMLElement).click();
          }
        }, modalSelector);
        await helpers.adaptiveWait(1000);
      } catch (e) {
        console.log('Failed to close already open modal:', e);
      }
    }
    
    // Open modal with retry logic
    let openResult: TestResult;
    let modalOpened = false;
    
    for (let attempt = 0; attempt <= retries; attempt++) {
      if (attempt > 0) {
        console.log(`🔄 Retry ${attempt}/${retries} opening modal...`);
        await helpers.adaptiveWait(1000 * attempt); // Increasing wait between retries
      }
      
      // Click the trigger element
      openResult = await helpers.clickElement(triggerSelector, {
        category: ErrorCategory.MODAL_INTERACTION,
        retries: 1
      });
      
      if (!openResult.success) {
        if (attempt === retries) {
          return {
            ...openResult,
            message: `Failed to trigger modal after ${retries + 1} attempts: ${openResult.message}`
          };
        } else {
          continue; // Try again
        }
      }
      
      // Wait for modal to appear with proper animation handling
      await helpers.adaptiveWait(500); // Give time for modal to start appearing
      
      // Use the enhanced waitForModalToAppear method instead of basic waitForElement
      const modalAppearResult = await helpers.waitForModalToAppear(modalSelector, waitTime);
      
      if (modalAppearResult.success) {
        modalOpened = true;
        break;
      } else if (attempt === retries) {
        return {
          ...modalAppearResult,
          message: `Modal failed to appear after ${retries + 1} trigger attempts: ${modalAppearResult.message}`
        };
      }
    }
    
    if (!modalOpened) {
      return {
        success: false,
        message: `Failed to open modal after ${retries + 1} attempts`,
        errorCategory: ErrorCategory.MODAL_INTERACTION,
        timestamp,
        screenshot: await helpers.captureScreenshot('modal-failed-to-open')
      };
    }
    
    // Allow modal animations to complete
    await helpers.adaptiveWait(800);
    await helpers.captureScreenshot('modal-opened');
    
    // Check modal state before performing actions
    if (validateBeforeActions) {
      const modalDiagnosis = await helpers.diagnoseModalState(modalSelector);
      
      if (!modalDiagnosis.success) {
        return {
          success: false,
          message: `Modal is in an invalid state before performing actions: ${modalDiagnosis.message}`,
          details: modalDiagnosis.details,
          errorCategory: ErrorCategory.MODAL_INTERACTION,
          timestamp,
          screenshot: await helpers.captureScreenshot('modal-invalid-state')
        };
      }
    }
    
    try {
      // Perform actions in modal with better error handling
      const actionResult = await actions();
      
      // If actions succeeded but modal should be closed and isn't, consider it a failure
      if (actionResult.success && ensureClosed) {
        await helpers.adaptiveWait(1500); // Wait for potential modal closing animation
        
        const modalStillOpen = await helpers.elementVisible(modalSelector);
        if (modalStillOpen) {
          // Capture final state for diagnostics
          await helpers.captureScreenshot('modal-not-closed-after-actions');
          
          // Try to diagnose why modal is still open
          const finalModalState = await helpers.diagnoseModalState(modalSelector);
          
          return {
            success: false,
            message: 'Actions completed successfully but modal was not closed',
            details: {
              actionResult: actionResult.details,
              modalState: finalModalState.details
            },
            errorCategory: ErrorCategory.MODAL_INTERACTION,
            timestamp: Date.now(),
            screenshot: await helpers.captureScreenshot('modal-still-open')
          };
        }
      }
      
      // Capture successful completion
      await helpers.captureScreenshot('modal-interaction-complete');
      return actionResult;
      
    } catch (error) {
      // Enhanced error handling with detailed diagnostics
      console.error('💥 Error during modal interaction:', error);
      
      // Capture state on error
      await helpers.captureScreenshot('modal-interaction-error');
      
      // Get detailed modal state on error
      const errorModalState = await helpers.diagnoseModalState(modalSelector);
      
      // Capture DOM context around any visible form elements
      const formContext = await helpers.page.evaluate((selector) => {
        const modal = document.querySelector(selector);
        if (!modal) return null;
        
        const formElements = modal.querySelectorAll('input, select, textarea, button');
        return Array.from(formElements).map(el => {
          const element = el as HTMLElement;
          return {
            tagName: element.tagName,
            id: element.id,
            name: (element as any).name || '',
            value: (element as any).value || '',
            type: (element as any).type || '',
            isDisabled: (element as any).disabled || false,
            isValid: !(element.classList.contains('is-invalid') ||
                      element.getAttribute('aria-invalid') === 'true'),
            validationMessage: (element as any).validationMessage || ''
          };
        });
      }, modalSelector);
      
      return {
        success: false,
        message: 'Error during modal interaction',
        details: {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          modalState: errorModalState.details,
          formContext
        },
        errorCategory: ErrorCategory.MODAL_INTERACTION,
        timestamp: Date.now(),
        screenshot: await helpers.captureScreenshot('modal-interaction-error-final')
      };
    }
  },
  
  /**
   * A simpler modal interaction test with minimal complexity
   * Use this as an alternative when the more sophisticated testModalInteraction has issues
   * @param helpers - TestHelpers instance
   * @param triggerSelector - Selector to trigger/open the modal
   * @param modalSelector - Selector to identify the modal
   * @param actions - Callback function containing actions to perform within the modal
   */
  async testModalInteractionSimple(helpers: TestHelpers, triggerSelector: string, modalSelector: string, actions: () => Promise<TestResult>): Promise<TestResult> {
    // Open modal
    const openResult = await helpers.clickElement(triggerSelector, {
      category: ErrorCategory.MODAL_INTERACTION
    });
    
    if (!openResult.success) {
      return {
        ...openResult,
        message: `Failed to trigger modal: ${openResult.message}`
      };
    }
    
    // Wait for modal to appear with a longer timeout
    await helpers.takeScreenshot('modal-before-wait');
    
    // Check if modal exists
    const modalExists = await helpers.elementExists(modalSelector, 10000);
    if (!modalExists) {
      return {
        success: false,
        message: `Modal did not appear: ${modalSelector}`,
        errorCategory: ErrorCategory.MODAL_INTERACTION,
        timestamp: Date.now()
      };
    }
    
    // Allow modal animations to complete
    await helpers.waitAdaptively(800);
    await helpers.takeScreenshot('modal-opened-simple');
    
    try {
      // Perform actions in modal
      const actionResult = await actions();
      
      // Capture successful completion
      await helpers.takeScreenshot('modal-interaction-complete-simple');
      return actionResult;
    } catch (error) {
      await helpers.takeScreenshot('modal-interaction-error-simple');
      return {
        success: false,
        message: 'Error during modal interaction',
        details: error instanceof Error ? error.message : String(error),
        errorCategory: ErrorCategory.MODAL_INTERACTION,
        timestamp: Date.now()
      };
    }
  }
};