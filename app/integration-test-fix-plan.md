# Integration Test Fix Plan: Incremental Approach

## Overview

This plan addresses the failing integration tests in the AbacusHub project. Currently, 6 out of 7 tests are failing with the same pattern: helper methods returning `{ success: false }` when trying to interact with UI elements. We'll fix these incrementally, starting with the workspace creation test.

## Current Status

- ✅ **Login functionality**: Working correctly
- ✅ **Navigation**: Tests can navigate between pages
- ❌ **UI Interactions**: All create/click operations failing
- ✅ **Form State Management**: One test passing (provides clues)

## Root Cause Analysis

The tests are failing because:

1. **Selector Issues**: Multiple fallback selectors where the final `button` fallback is too generic
2. **Element Visibility**: Elements exist in DOM but aren't visible/interactable
3. **Page Load Timing**: Elements exist but aren't ready for interaction
4. **Missing Test Identifiers**: Relying on dynamic content instead of stable test IDs

## Phase 1: Debug and Fix Workspace Creation Test

### Step 1: Enhanced Debug Logging

```typescript
// Add to helpers.ts
async createWorkspaceDebug(workspaceData) {
  console.log('🔍 DEBUG: Starting workspace creation');
  console.log(`📍 Current URL: ${this.page.url()}`);
  
  // Take screenshot before starting
  await this.page.screenshot({ path: 'debug-before-create.png' });
  
  // Debug each selector step by step
  await this.debugSelector(WORKSPACE_SELECTORS.CREATE_WORKSPACE_BUTTON);
  await this.debugSelector(WORKSPACE_SELECTORS.WORKSPACE_MODAL);
  await this.debugSelector(WORKSPACE_SELECTORS.WORKSPACE_NAME_INPUT);
  
  // Continue with enhanced logging for each step...
}

async debugSelector(selector: string, description?: string) {
  console.log(`\n🔍 Testing selector: ${selector}`);
  
  const exists = await this.elementExists(selector);
  console.log(`  ✓ Exists: ${exists}`);
  
  if (exists) {
    const visible = await this.elementVisible(selector);
    console.log(`  ✓ Visible: ${visible}`);
    
    const clickable = await this.page.evaluate((sel) => {
      const element = document.querySelector(sel);
      if (!element) return false;
      
      const rect = element.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0 && !element.disabled;
    }, selector);
    console.log(`  ✓ Clickable: ${clickable}`);
    
    // Take screenshot highlighting the element
    await this.page.screenshot({ 
      path: `debug-${selector.replace(/[^a-zA-Z0-9]/g, '-')}.png` 
    });
  }
}
```

### Step 2: Add data-testid Attributes

Update React components with stable test identifiers:

```tsx
// app/dashboard/workspaces/page.tsx
<Button data-testid="create-workspace-button">
  <Plus className="w-4 h-4 mr-2" />
  New Workspace
</Button>

<DialogContent className="sm:max-w-[425px]" data-testid="workspace-modal">
  <Input
    id="name"
    data-testid="workspace-name-input"
    name="name"
    placeholder="Enter workspace name"
    value={newWorkspace.name}
    onChange={(e) => setNewWorkspace({ ...newWorkspace, name: e.target.value })}
    required
  />
  <Textarea
    id="description"
    data-testid="workspace-description-input"
    name="description"
    placeholder="Describe your workspace"
    value={newWorkspace.description}
    onChange={(e) => setNewWorkspace({ ...newWorkspace, description: e.target.value })}
  />
  <Button type="submit" data-testid="workspace-submit-button">
    Create Workspace
  </Button>
</DialogContent>
```

### Step 3: Improve Helper Methods

Enhance helper methods with better visibility and interaction checks:

```typescript
// Enhanced clickElement method
async clickElement(selector: string, options?: { timeout?: number }): Promise<TestResult> {
  try {
    console.log(`🎯 Attempting to click: ${selector}`);
    
    // Wait for element to exist
    await this.page.waitForSelector(selector, { timeout: options?.timeout || config.timeout });
    
    // Check if element is actually clickable
    const isClickable = await this.page.evaluate((sel) => {
      const element = document.querySelector(sel);
      if (!element) return false;
      
      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      
      return rect.width > 0 && 
             rect.height > 0 && 
             style.display !== 'none' &&
             style.visibility !== 'hidden' &&
             style.opacity !== '0' &&
             !element.disabled;
    }, selector);
    
    if (!isClickable) {
      console.log(`❌ Element not clickable: ${selector}`);
      // Take screenshot for debugging
      await this.page.screenshot({ path: `debug-not-clickable-${Date.now()}.png` });
      
      return {
        success: false,
        message: `Element not clickable: ${selector}`,
        details: 'Element exists but is not in a clickable state'
      };
    }
    
    // Scroll element into view if needed
    await this.page.evaluate((sel) => {
      const element = document.querySelector(sel);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, selector);
    
    // Wait a bit for scroll to complete
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Attempt to click
    await this.page.click(selector);
    await new Promise(resolve => setTimeout(resolve, 500));
    
    console.log(`✅ Successfully clicked: ${selector}`);
    return {
      success: true,
      message: `Successfully clicked element: ${selector}`
    };
    
  } catch (error) {
    console.log(`💥 Click failed: ${selector} - ${error.message}`);
    
    // Take screenshot on failure
    await this.page.screenshot({ path: `debug-click-failed-${Date.now()}.png` });
    
    return {
      success: false,
      message: `Failed to click element: ${selector}`,
      details: error.message
    };
  }
}

// Enhanced waitForElement with better error reporting
async waitForElement(selector: string, timeout?: number): Promise<TestResult> {
  try {
    console.log(`⏳ Waiting for element: ${selector}`);
    
    await this.page.waitForSelector(selector, { timeout: timeout || config.timeout });
    
    // Additional check to ensure element is ready
    const isReady = await this.page.evaluate((sel) => {
      const element = document.querySelector(sel);
      if (!element) return false;
      
      const rect = element.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    }, selector);
    
    if (!isReady) {
      console.log(`⚠️ Element found but not ready: ${selector}`);
      // Wait a bit more and try again
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log(`✅ Element ready: ${selector}`);
    return {
      success: true,
      message: `Element found: ${selector}`
    };
    
  } catch (error) {
    console.log(`❌ Element not found: ${selector} - ${error.message}`);
    
    // Take screenshot to see current state
    await this.page.screenshot({ path: `debug-element-not-found-${Date.now()}.png` });
    
    return {
      success: false,
      message: `Element not found: ${selector}`,
      details: error.message
    };
  }
}
```

### Step 4: Update Selectors

Simplify selectors to use primary data-testid attributes:

```typescript
// Update selectors.ts
export const WORKSPACE_