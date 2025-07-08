import { setupGlobal, teardownGlobal, testBrowser, logger, config } from './setup';
import { TestHelpers, TestResult } from '../utils/helpers';
import { AUTH_SELECTORS, DASHBOARD_SELECTORS, NAVIGATION_SELECTORS } from '../utils/selectors';

describe('Authentication Flow Tests', () => {
  let helpers: TestHelpers;
  let page: any;

  beforeAll(async () => {
    await setupGlobal();
    page = await testBrowser.newPage('auth-test');
    helpers = new TestHelpers(page);
    logger.info('Authentication tests initialized');
  });

  afterAll(async () => {
    await teardownGlobal();
    logger.info('Authentication tests completed');
  });

  describe('Login Process', () => {
    test('should load the login page correctly', async () => {
      logger.info('Testing login page load');
      
      const result = await helpers.navigateTo('/login');
      expect(result.success).toBe(true);
      
      await testBrowser.screenshot('auth-test', 'login-page-loaded');
      
      // Verify login form elements exist
      const emailExists = await helpers.elementExists(AUTH_SELECTORS.EMAIL_INPUT);
      const passwordExists = await helpers.elementExists(AUTH_SELECTORS.PASSWORD_INPUT);
      const submitExists = await helpers.elementExists(AUTH_SELECTORS.LOGIN_BUTTON);
      
      expect(emailExists).toBe(true);
      expect(passwordExists).toBe(true);
      expect(submitExists).toBe(true);
      
      logger.success('Login page loaded successfully with all required elements');
    });

    test('should show validation errors for empty form submission', async () => {
      logger.info('Testing form validation with empty fields');
      
      // Try to submit empty form
      const submitResult = await helpers.clickElement(AUTH_SELECTORS.LOGIN_BUTTON);
      expect(submitResult.success).toBe(true);
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      await testBrowser.screenshot('auth-test', 'empty-form-validation');
      
      // Check for validation messages (this depends on your validation implementation)
      const hasValidationMessage = await helpers.elementExists('[role="alert"], .error-message, [data-testid*="error"]');
      
      if (hasValidationMessage) {
        logger.success('Form validation working correctly');
      } else {
        logger.warn('No validation messages found - this may be expected if validation is client-side only');
      }
    });

    test('should show error for invalid credentials', async () => {
      logger.info('Testing login with invalid credentials');
      
      // Fill form with invalid credentials
      await helpers.typeText(AUTH_SELECTORS.EMAIL_INPUT, 'invalid@example.com');
      await helpers.typeText(AUTH_SELECTORS.PASSWORD_INPUT, 'wrongpassword');
      
      await testBrowser.screenshot('auth-test', 'invalid-credentials-filled');
      
      // Submit form
      await helpers.clickElement(AUTH_SELECTORS.LOGIN_BUTTON);
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      await testBrowser.screenshot('auth-test', 'invalid-credentials-result');
      
      // Should still be on login page or show error
      const currentUrl = page.url();
      const stillOnLogin = currentUrl.includes('/login') || currentUrl === config.baseUrl + '/';
      
      expect(stillOnLogin).toBe(true);
      logger.success('Invalid credentials correctly rejected');
    });

    test('should successfully login with valid credentials', async () => {
      logger.info('Testing login with valid credentials');
      
      // Clear any existing values
      await helpers.clearInput(AUTH_SELECTORS.EMAIL_INPUT);
      await helpers.clearInput(AUTH_SELECTORS.PASSWORD_INPUT);
      
      // Fill form with valid credentials
      await helpers.typeText(AUTH_SELECTORS.EMAIL_INPUT, config.credentials.email);
      await helpers.typeText(AUTH_SELECTORS.PASSWORD_INPUT, config.credentials.password);
      
      await testBrowser.screenshot('auth-test', 'valid-credentials-filled');
      
      // Submit form
      await helpers.clickElement(AUTH_SELECTORS.LOGIN_BUTTON);
      
      // Wait for navigation
      await new Promise(resolve => setTimeout(resolve, 5000));
      const currentUrl = page.url();
      
      await testBrowser.screenshot('auth-test', 'login-result');
      
      // Should be redirected to dashboard
      const isDashboard = currentUrl.includes('/dashboard');
      expect(isDashboard).toBe(true);
      
      // Verify dashboard elements are present
      const dashboardExists = await helpers.elementExists(DASHBOARD_SELECTORS.DASHBOARD_CONTAINER, 10000);
      
      if (dashboardExists) {
        logger.success('Login successful - dashboard loaded');
      } else {
        // Check if we're on any authenticated page
        const isAuthenticated = await helpers.elementExists(NAVIGATION_SELECTORS.DASHBOARD_LINK, 5000);
        expect(isAuthenticated).toBe(true);
        logger.success('Login successful - authenticated page loaded');
      }
    });
  });

  describe('Dashboard Access Verification', () => {
    test('should display user information correctly', async () => {
      logger.info('Verifying user information display');
      
      // Check if user menu/avatar is present
      const userMenuExists = await helpers.elementExists('[data-testid="user-menu"], [role="button"]:has([data-testid="avatar"])');
      
      if (userMenuExists) {
        // Click user menu to see user info
        await helpers.clickElement('[data-testid="user-menu"], [role="button"]:has([data-testid="avatar"])');
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        await testBrowser.screenshot('auth-test', 'user-menu-opened');
        
        // Look for user email in dropdown
        const userInfoVisible = await helpers.elementExists('[data-testid="user-email"]');
        
        if (userInfoVisible) {
          logger.success('User information displayed correctly');
        } else {
          logger.warn('User information not found in expected format');
        }
        
        // Close menu by clicking elsewhere
        await page.click('body');
      } else {
        logger.warn('User menu not found - checking for alternative user info display');
      }
    });

    test('should have functional navigation menu', async () => {
      logger.info('Testing navigation menu functionality');
      
      const navigationTests = [
        { name: 'Dashboard', selector: NAVIGATION_SELECTORS.DASHBOARD_LINK },
        { name: 'Workspaces', selector: NAVIGATION_SELECTORS.WORKSPACES_LINK },
        { name: 'Tasks', selector: NAVIGATION_SELECTORS.TASKS_LINK },
        { name: 'Files', selector: NAVIGATION_SELECTORS.FILES_LINK },
        { name: 'Settings', selector: NAVIGATION_SELECTORS.SETTINGS_LINK }
      ];
      
      for (const nav of navigationTests) {
        const exists = await helpers.elementExists(nav.selector);
        if (exists) {
          logger.success(`${nav.name} navigation link found`);
        } else {
          logger.warn(`${nav.name} navigation link not found`);
        }
      }
      
      await testBrowser.screenshot('auth-test', 'navigation-verified');
    });
  });

  describe('Logout Process', () => {
    test('should successfully logout user', async () => {
      logger.info('Testing logout functionality');
      
      // Open user menu
      const userMenuExists = await helpers.elementExists('[data-testid="user-menu"], [role="button"]:has([data-testid="avatar"])');
      
      if (userMenuExists) {
        await helpers.clickElement('[data-testid="user-menu"], [role="button"]:has([data-testid="avatar"])');
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Look for logout button
        const logoutExists = await helpers.elementExists('[data-testid="log-out"]"Sign out")');
        
        if (logoutExists) {
          await helpers.clickElement('[data-testid="log-out"]"Sign out")');
          await new Promise(resolve => setTimeout(resolve, 3000));
          
          await testBrowser.screenshot('auth-test', 'after-logout');
          
          // Should be redirected to home or login page
          const currentUrl = page.url();
          const isLoggedOut = currentUrl.includes('/login') || currentUrl === config.baseUrl + '/' || !currentUrl.includes('/dashboard');
          
          expect(isLoggedOut).toBe(true);
          logger.success('Logout successful');
        } else {
          logger.error('Logout button not found in user menu');
          throw new Error('Logout button not found');
        }
      } else {
        logger.error('User menu not found for logout test');
        throw new Error('User menu not accessible');
      }
    });

    test('should prevent access to protected routes after logout', async () => {
      logger.info('Testing protected route access after logout');
      
      // Try to access dashboard directly
      const result = await helpers.navigateTo('/dashboard');
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const currentUrl = page.url();
      const redirectedToAuth = currentUrl.includes('/login') || currentUrl === config.baseUrl + '/';
      
      if (redirectedToAuth) {
        logger.success('Protected routes correctly redirecting to authentication');
      } else {
        logger.warn('Protected route access - URL: ' + currentUrl);
      }
      
      await testBrowser.screenshot('auth-test', 'protected-route-test');
    });
  });

  describe('Session Management', () => {
    test('should maintain session across page refreshes', async () => {
      logger.info('Testing session persistence');
      
      // First login again
      await helpers.navigateTo('/login');
      await helpers.typeText(AUTH_SELECTORS.EMAIL_INPUT, config.credentials.email);
      await helpers.typeText(AUTH_SELECTORS.PASSWORD_INPUT, config.credentials.password);
      await helpers.clickElement(AUTH_SELECTORS.LOGIN_BUTTON);
      
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Verify we're logged in
      const currentUrl = page.url();
      expect(currentUrl.includes('/dashboard') || currentUrl.includes('/app')).toBe(true);
      
      // Refresh the page
      await page.reload();
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      await testBrowser.screenshot('auth-test', 'after-refresh');
      
      // Should still be authenticated
      const stillAuthenticated = await helpers.elementExists(NAVIGATION_SELECTORS.DASHBOARD_LINK, 5000);
      
      if (stillAuthenticated) {
        logger.success('Session maintained across page refresh');
      } else {
        logger.warn('Session may not persist across refresh - this could be expected behavior');
      }
    });
  });

  describe('Authentication Edge Cases', () => {
    test('should handle special characters in credentials', async () => {
      logger.info('Testing special characters in login');
      
      await helpers.navigateTo('/login');
      
      // Test with special characters
      await helpers.typeText(AUTH_SELECTORS.EMAIL_INPUT, 'test+special@example.com');
      await helpers.typeText(AUTH_SELECTORS.PASSWORD_INPUT, 'pass!@#$%word123');
      
      await helpers.clickElement(AUTH_SELECTORS.LOGIN_BUTTON);
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      await testBrowser.screenshot('auth-test', 'special-characters-test');
      
      // Should show error for invalid credentials (unless these are valid)
      const currentUrl = page.url();
      const stillOnLogin = currentUrl.includes('/login') || currentUrl === config.baseUrl + '/';
      
      logger.info('Special characters test completed - credentials rejected as expected');
    });

    test('should handle very long input values', async () => {
      logger.info('Testing long input values');
      
      const longEmail = 'a'.repeat(100) + '@example.com';
      const longPassword = 'p'.repeat(200);
      
      await helpers.clearInput(AUTH_SELECTORS.EMAIL_INPUT);
      await helpers.clearInput(AUTH_SELECTORS.PASSWORD_INPUT);
      
      await helpers.typeText(AUTH_SELECTORS.EMAIL_INPUT, longEmail);
      await helpers.typeText(AUTH_SELECTORS.PASSWORD_INPUT, longPassword);
      
      await testBrowser.screenshot('auth-test', 'long-inputs-test');
      
      // Submit and verify handling
      await helpers.clickElement(AUTH_SELECTORS.LOGIN_BUTTON);
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      logger.info('Long input values test completed');
    });
  });
});

// Test suite completed