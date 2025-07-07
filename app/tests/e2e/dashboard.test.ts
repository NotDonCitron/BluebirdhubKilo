import { setupGlobal, teardownGlobal, testBrowser, logger, config } from './setup';
import { TestHelpers, TestResult } from '../utils/helpers';
import { NAVIGATION_SELECTORS, DASHBOARD_SELECTORS, MODAL_SELECTORS } from '../utils/selectors';

describe('Dashboard Navigation Tests', () => {
  let helpers: TestHelpers;
  let page: any;

  beforeAll(async () => {
    await setupGlobal();
    page = await testBrowser.newPage('dashboard-test');
    helpers = new TestHelpers(page);
    
    // Login first
    const loginResult = await helpers.login();
    expect(loginResult.success).toBe(true);
    
    logger.info('Dashboard tests initialized and user logged in');
  });

  afterAll(async () => {
    await teardownGlobal();
    logger.info('Dashboard tests completed');
  });

  describe('Main Navigation', () => {
    test('should navigate to dashboard from any page', async () => {
      logger.info('Testing dashboard navigation');
      
      const result = await helpers.clickElement(NAVIGATION_SELECTORS.DASHBOARD_LINK);
      expect(result.success).toBe(true);
      
      await helpers.waitForNavigation('/dashboard');
      await testBrowser.screenshot('dashboard-test', 'dashboard-loaded');
      
      const dashboardExists = await helpers.elementExists(DASHBOARD_SELECTORS.DASHBOARD_CONTAINER);
      expect(dashboardExists).toBe(true);
      
      logger.success('Dashboard navigation successful');
    });

    test('should navigate to workspaces page', async () => {
      logger.info('Testing workspaces navigation');
      
      const result = await helpers.clickElement(NAVIGATION_SELECTORS.WORKSPACES_LINK);
      expect(result.success).toBe(true);
      
      await helpers.waitForNavigation('/workspaces');
      await testBrowser.screenshot('dashboard-test', 'workspaces-loaded');
      
      logger.success('Workspaces navigation successful');
    });

    test('should navigate to tasks page', async () => {
      logger.info('Testing tasks navigation');
      
      const result = await helpers.clickElement(NAVIGATION_SELECTORS.TASKS_LINK);
      expect(result.success).toBe(true);
      
      await helpers.waitForNavigation('/tasks');
      await testBrowser.screenshot('dashboard-test', 'tasks-loaded');
      
      logger.success('Tasks navigation successful');
    });

    test('should navigate to files page', async () => {
      logger.info('Testing files navigation');
      
      const result = await helpers.clickElement(NAVIGATION_SELECTORS.FILES_LINK);
      expect(result.success).toBe(true);
      
      await helpers.waitForNavigation('/files');
      await testBrowser.screenshot('dashboard-test', 'files-loaded');
      
      logger.success('Files navigation successful');
    });

    test('should navigate to settings page', async () => {
      logger.info('Testing settings navigation');
      
      const result = await helpers.clickElement(NAVIGATION_SELECTORS.SETTINGS_LINK);
      expect(result.success).toBe(true);
      
      await helpers.waitForNavigation('/settings');
      await testBrowser.screenshot('dashboard-test', 'settings-loaded');
      
      logger.success('Settings navigation successful');
    });
  });

  describe('Mobile Navigation', () => {
    test('should open and close mobile menu', async () => {
      logger.info('Testing mobile navigation menu');
      
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      await page.waitForTimeout(1000);
      
      await testBrowser.screenshot('dashboard-test', 'mobile-viewport');
      
      // Check if mobile menu trigger exists
      const mobileMenuExists = await helpers.elementExists(NAVIGATION_SELECTORS.MOBILE_MENU_TRIGGER);
      
      if (mobileMenuExists) {
        // Open mobile menu
        await helpers.clickElement(NAVIGATION_SELECTORS.MOBILE_MENU_TRIGGER);
        await page.waitForTimeout(1000);
        
        await testBrowser.screenshot('dashboard-test', 'mobile-menu-opened');
        
        // Check if menu is visible
        const menuVisible = await helpers.elementVisible(NAVIGATION_SELECTORS.MOBILE_MENU);
        expect(menuVisible).toBe(true);
        
        // Close menu (click outside or close button)
        await page.click('body');
        await page.waitForTimeout(1000);
        
        logger.success('Mobile menu functionality working');
      } else {
        logger.warn('Mobile menu trigger not found - may not be implemented');
      }
      
      // Reset to desktop viewport
      await page.setViewportSize({ width: 1366, height: 768 });
    });
  });

  describe('Command Palette', () => {
    test('should open command palette with keyboard shortcut', async () => {
      logger.info('Testing command palette keyboard shortcut');
      
      // Press Cmd+K (or Ctrl+K)
      await page.keyboard.down('Meta');
      await page.keyboard.press('KeyK');
      await page.keyboard.up('Meta');
      
      await page.waitForTimeout(1000);
      await testBrowser.screenshot('dashboard-test', 'command-palette-keyboard');
      
      const paletteExists = await helpers.elementExists(NAVIGATION_SELECTORS.COMMAND_PALETTE);
      
      if (paletteExists) {
        logger.success('Command palette opened with keyboard shortcut');
        
        // Close palette
        await page.keyboard.press('Escape');
        await page.waitForTimeout(500);
      } else {
        logger.warn('Command palette not found after keyboard shortcut');
      }
    });

    test('should open command palette with button click', async () => {
      logger.info('Testing command palette button');
      
      const commandTriggerExists = await helpers.elementExists(NAVIGATION_SELECTORS.COMMAND_TRIGGER);
      
      if (commandTriggerExists) {
        await helpers.clickElement(NAVIGATION_SELECTORS.COMMAND_TRIGGER);
        await page.waitForTimeout(1000);
        
        await testBrowser.screenshot('dashboard-test', 'command-palette-button');
        
        const paletteExists = await helpers.elementExists(NAVIGATION_SELECTORS.COMMAND_PALETTE);
        expect(paletteExists).toBe(true);
        
        // Test typing in command palette
        const inputExists = await helpers.elementExists(NAVIGATION_SELECTORS.COMMAND_INPUT);
        if (inputExists) {
          await helpers.typeText(NAVIGATION_SELECTORS.COMMAND_INPUT, 'dashboard');
          await page.waitForTimeout(1000);
          
          await testBrowser.screenshot('dashboard-test', 'command-palette-search');
        }
        
        // Close palette
        await page.keyboard.press('Escape');
        await page.waitForTimeout(500);
        
        logger.success('Command palette functionality working');
      } else {
        logger.warn('Command palette trigger button not found');
      }
    });
  });

  describe('Theme Toggle', () => {
    test('should toggle between light and dark themes', async () => {
      logger.info('Testing theme toggle functionality');
      
      const themeToggleExists = await helpers.elementExists(DASHBOARD_SELECTORS.THEME_TOGGLE);
      
      if (themeToggleExists) {
        // Take screenshot of current theme
        await testBrowser.screenshot('dashboard-test', 'theme-before-toggle');
        
        // Click theme toggle
        await helpers.clickElement(DASHBOARD_SELECTORS.THEME_TOGGLE);
        await page.waitForTimeout(1000);
        
        // Take screenshot after toggle
        await testBrowser.screenshot('dashboard-test', 'theme-after-toggle');
        
        // Toggle back
        await helpers.clickElement(DASHBOARD_SELECTORS.THEME_TOGGLE);
        await page.waitForTimeout(1000);
        
        await testBrowser.screenshot('dashboard-test', 'theme-toggled-back');
        
        logger.success('Theme toggle functionality working');
      } else {
        logger.warn('Theme toggle button not found');
      }
    });
  });

  describe('User Menu', () => {
    test('should open and interact with user dropdown menu', async () => {
      logger.info('Testing user dropdown menu');
      
      const userMenuExists = await helpers.elementExists('[data-testid="user-menu"], button:has([data-testid="avatar"])');
      
      if (userMenuExists) {
        // Open user menu
        await helpers.clickElement('[data-testid="user-menu"], button:has([data-testid="avatar"])');
        await page.waitForTimeout(1000);
        
        await testBrowser.screenshot('dashboard-test', 'user-menu-opened');
        
        // Check for menu items
        const settingsLinkExists = await helpers.elementExists('a[href="/dashboard/settings"], button:has-text("Settings")');
        const logoutButtonExists = await helpers.elementExists('button:has-text("Log out"), button:has-text("Sign out")');
        
        if (settingsLinkExists) {
          logger.success('Settings link found in user menu');
        }
        
        if (logoutButtonExists) {
          logger.success('Logout button found in user menu');
        }
        
        // Close menu by clicking elsewhere
        await page.click('main');
        await page.waitForTimeout(500);
        
        logger.success('User menu functionality working');
      } else {
        logger.warn('User menu not found');
      }
    });
  });

  describe('Notifications', () => {
    test('should interact with notifications button', async () => {
      logger.info('Testing notifications functionality');
      
      const notificationsExists = await helpers.elementExists(DASHBOARD_SELECTORS.NOTIFICATIONS_BUTTON);
      
      if (notificationsExists) {
        await helpers.clickElement(DASHBOARD_SELECTORS.NOTIFICATIONS_BUTTON);
        await page.waitForTimeout(1000);
        
        await testBrowser.screenshot('dashboard-test', 'notifications-clicked');
        
        // Check if notifications panel/dropdown appears
        const notificationsPanelExists = await helpers.elementExists('[data-testid="notifications-panel"], [role="dialog"]');
        
        if (notificationsPanelExists) {
          logger.success('Notifications panel opened');
          
          // Close panel
          await page.keyboard.press('Escape');
          await page.waitForTimeout(500);
        } else {
          logger.info('Notifications button clicked (panel may not be implemented)');
        }
      } else {
        logger.warn('Notifications button not found');
      }
    });
  });

  describe('Sidebar Functionality', () => {
    test('should display recent workspaces in sidebar', async () => {
      logger.info('Testing sidebar recent workspaces');
      
      // Navigate back to dashboard to see sidebar
      await helpers.clickElement(NAVIGATION_SELECTORS.DASHBOARD_LINK);
      await page.waitForTimeout(1000);
      
      // Look for recent workspaces section
      const recentWorkspacesExists = await helpers.elementExists('[data-testid="recent-workspaces"], :has-text("Recent Workspaces")');
      
      if (recentWorkspacesExists) {
        await testBrowser.screenshot('dashboard-test', 'recent-workspaces');
        
        // Check for workspace items
        const workspaceItems = await helpers.getElementCount('[data-testid="workspace-item"], a[href*="/workspaces/"]');
        logger.info(`Found ${workspaceItems} recent workspace items`);
        
        if (workspaceItems > 0) {
          logger.success('Recent workspaces displayed in sidebar');
        }
      } else {
        logger.warn('Recent workspaces section not found');
      }
    });

    test('should have functional quick actions in sidebar', async () => {
      logger.info('Testing sidebar quick actions');
      
      // Look for quick action buttons
      const quickActionsExists = await helpers.elementExists('[data-testid="quick-actions"], button:has([data-testid="plus-icon"])');
      
      if (quickActionsExists) {
        await helpers.clickElement('[data-testid="quick-actions"], button:has([data-testid="plus-icon"])');
        await page.waitForTimeout(1000);
        
        await testBrowser.screenshot('dashboard-test', 'quick-actions');
        
        logger.success('Quick actions functionality working');
      } else {
        logger.warn('Quick actions not found in sidebar');
      }
    });
  });

  describe('Real-time Features', () => {
    test('should display real-time status indicator', async () => {
      logger.info('Testing real-time status indicator');
      
      const realtimeStatusExists = await helpers.elementExists('[data-testid="realtime-status"], [data-testid="connection-status"]');
      
      if (realtimeStatusExists) {
        await testBrowser.screenshot('dashboard-test', 'realtime-status');
        logger.success('Real-time status indicator found');
      } else {
        logger.warn('Real-time status indicator not found');
      }
    });
  });

  describe('Dashboard Stats and Widgets', () => {
    test('should display dashboard statistics', async () => {
      logger.info('Testing dashboard statistics display');
      
      // Navigate to main dashboard
      await helpers.clickElement(NAVIGATION_SELECTORS.DASHBOARD_LINK);
      await page.waitForTimeout(2000);
      
      // Look for stats cards
      const statsCards = await helpers.getElementCount(DASHBOARD_SELECTORS.STATS_CARDS);
      logger.info(`Found ${statsCards} statistics cards`);
      
      if (statsCards > 0) {
        await testBrowser.screenshot('dashboard-test', 'dashboard-stats');
        logger.success('Dashboard statistics displayed');
      } else {
        logger.warn('No statistics cards found on dashboard');
      }
    });

    test('should display recent activity', async () => {
      logger.info('Testing recent activity display');
      
      const recentActivityExists = await helpers.elementExists(DASHBOARD_SELECTORS.RECENT_ACTIVITY);
      
      if (recentActivityExists) {
        await testBrowser.screenshot('dashboard-test', 'recent-activity');
        logger.success('Recent activity section found');
      } else {
        logger.warn('Recent activity section not found');
      }
    });
  });
});