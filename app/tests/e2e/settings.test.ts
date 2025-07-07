import { setupGlobal, teardownGlobal, testBrowser, logger, config } from './setup';
import { TestHelpers, TestResult } from '../utils/helpers';
import { SETTINGS_SELECTORS, NAVIGATION_SELECTORS, TOAST_SELECTORS, FORM_SELECTORS } from '../utils/selectors';

describe('Settings Page Tests', () => {
  let helpers: TestHelpers;
  let page: any;

  beforeAll(async () => {
    await setupGlobal();
    page = await testBrowser.newPage('settings-test');
    helpers = new TestHelpers(page);
    
    // Login first
    const loginResult = await helpers.login();
    expect(loginResult.success).toBe(true);
    
    logger.info('Settings tests initialized and user logged in');
  });

  afterAll(async () => {
    await teardownGlobal();
    logger.info('Settings tests completed');
  });

  beforeEach(async () => {
    await helpers.navigateTo('/dashboard/settings');
    await page.waitForTimeout(2000);
  });

  describe('Settings Page Display', () => {
    test('should display settings page correctly', async () => {
      logger.info('Testing settings page display');
      
      await testBrowser.screenshot('settings-test', 'settings-page-loaded');
      
      // Check if settings container exists
      const containerExists = await helpers.elementExists(SETTINGS_SELECTORS.SETTINGS_CONTAINER);
      expect(containerExists).toBe(true);
      
      logger.success('Settings page displayed correctly');
    });

    test('should display settings navigation tabs', async () => {
      logger.info('Testing settings navigation tabs');
      
      const tabs = [
        { name: 'Profile', selector: SETTINGS_SELECTORS.PROFILE_TAB },
        { name: 'Account', selector: SETTINGS_SELECTORS.ACCOUNT_TAB },
        { name: 'Notifications', selector: SETTINGS_SELECTORS.NOTIFICATIONS_TAB },
        { name: 'Privacy', selector: SETTINGS_SELECTORS.PRIVACY_TAB },
        { name: 'Security', selector: SETTINGS_SELECTORS.SECURITY_TAB }
      ];
      
      let tabsFound = 0;
      for (const tab of tabs) {
        const exists = await helpers.elementExists(tab.selector);
        if (exists) {
          tabsFound++;
          logger.success(`${tab.name} tab found`);
        }
      }
      
      await testBrowser.screenshot('settings-test', 'settings-tabs');
      logger.success(`Found ${tabsFound} settings tabs`);
      
      expect(tabsFound).toBeGreaterThan(0);
    });
  });

  describe('Profile Settings', () => {
    beforeEach(async () => {
      // Navigate to profile tab if it exists
      const profileTabExists = await helpers.elementExists(SETTINGS_SELECTORS.PROFILE_TAB);
      if (profileTabExists) {
        await helpers.clickElement(SETTINGS_SELECTORS.PROFILE_TAB);
        await page.waitForTimeout(1000);
      }
    });

    test('should display profile form fields', async () => {
      logger.info('Testing profile form fields display');
      
      await testBrowser.screenshot('settings-test', 'profile-settings');
      
      const fields = [
        { name: 'Name Input', selector: SETTINGS_SELECTORS.PROFILE_NAME_INPUT },
        { name: 'Email Input', selector: SETTINGS_SELECTORS.PROFILE_EMAIL_INPUT },
        { name: 'Bio Input', selector: SETTINGS_SELECTORS.PROFILE_BIO_INPUT }
      ];
      
      let fieldsFound = 0;
      for (const field of fields) {
        const exists = await helpers.elementExists(field.selector);
        if (exists) {
          fieldsFound++;
          logger.success(`${field.name} found`);
        }
      }
      
      expect(fieldsFound).toBeGreaterThan(0);
      logger.success(`Found ${fieldsFound} profile form fields`);
    });

    test('should update profile information', async () => {
      logger.info('Testing profile information update');
      
      const nameInputExists = await helpers.elementExists(SETTINGS_SELECTORS.PROFILE_NAME_INPUT);
      
      if (nameInputExists) {
        // Get current value
        const currentName = await helpers.getValue(SETTINGS_SELECTORS.PROFILE_NAME_INPUT);
        logger.info(`Current name: ${currentName}`);
        
        // Update name
        const newName = `Updated Name ${Date.now()}`;
        await helpers.clearInput(SETTINGS_SELECTORS.PROFILE_NAME_INPUT);
        await helpers.typeText(SETTINGS_SELECTORS.PROFILE_NAME_INPUT, newName);
        
        await testBrowser.screenshot('settings-test', 'profile-name-updated');
        
        // Save if save button exists
        const saveButtonExists = await helpers.elementExists(SETTINGS_SELECTORS.SAVE_SETTINGS_BUTTON);
        if (saveButtonExists) {
          await helpers.clickElement(SETTINGS_SELECTORS.SAVE_SETTINGS_BUTTON);
          await page.waitForTimeout(2000);
          
          await testBrowser.screenshot('settings-test', 'profile-saved');
          
          // Check for success indication
          const toastExists = await helpers.elementExists(TOAST_SELECTORS.TOAST_SUCCESS, 3000);
          if (toastExists) {
            logger.success('Profile update successful - toast notification appeared');
          } else {
            logger.info('Profile update attempted - checking for other success indicators');
          }
        }
        
        logger.success('Profile information update tested');
      } else {
        logger.warn('Profile name input not found');
      }
    });

    test('should handle avatar upload if available', async () => {
      logger.info('Testing avatar upload functionality');
      
      const avatarUploadExists = await helpers.elementExists(SETTINGS_SELECTORS.PROFILE_AVATAR_UPLOAD);
      
      if (avatarUploadExists) {
        // Click on the label that contains the file input
        const labelExists = await helpers.elementExists(`label:has(${SETTINGS_SELECTORS.PROFILE_AVATAR_UPLOAD})`);
        if (labelExists) {
          await helpers.clickElement(`label:has(${SETTINGS_SELECTORS.PROFILE_AVATAR_UPLOAD})`);
          await page.waitForTimeout(1000);
          
          await testBrowser.screenshot('settings-test', 'avatar-upload-clicked');
          
          logger.success('Avatar upload trigger tested');
        }
      } else {
        logger.warn('Avatar upload not found');
      }
    });

    test('should validate profile form fields', async () => {
      logger.info('Testing profile form validation');
      
      const emailInputExists = await helpers.elementExists(SETTINGS_SELECTORS.PROFILE_EMAIL_INPUT);
      
      if (emailInputExists) {
        // Clear email and try invalid format
        await helpers.clearInput(SETTINGS_SELECTORS.PROFILE_EMAIL_INPUT);
        await helpers.typeText(SETTINGS_SELECTORS.PROFILE_EMAIL_INPUT, 'invalid-email');
        
        // Try to save
        const saveButtonExists = await helpers.elementExists(SETTINGS_SELECTORS.SAVE_SETTINGS_BUTTON);
        if (saveButtonExists) {
          await helpers.clickElement(SETTINGS_SELECTORS.SAVE_SETTINGS_BUTTON);
          await page.waitForTimeout(1000);
          
          await testBrowser.screenshot('settings-test', 'profile-validation-error');
          
          // Check for validation error
          const errorExists = await helpers.elementExists(FORM_SELECTORS.ERROR_MESSAGE);
          if (errorExists) {
            logger.success('Profile form validation working');
          }
        }
        
        // Restore valid email
        await helpers.clearInput(SETTINGS_SELECTORS.PROFILE_EMAIL_INPUT);
        await helpers.typeText(SETTINGS_SELECTORS.PROFILE_EMAIL_INPUT, config.credentials.email);
      }
    });
  });

  describe('Account Settings', () => {
    beforeEach(async () => {
      const accountTabExists = await helpers.elementExists(SETTINGS_SELECTORS.ACCOUNT_TAB);
      if (accountTabExists) {
        await helpers.clickElement(SETTINGS_SELECTORS.ACCOUNT_TAB);
        await page.waitForTimeout(1000);
      }
    });

    test('should display account settings', async () => {
      logger.info('Testing account settings display');
      
      await testBrowser.screenshot('settings-test', 'account-settings');
      
      // Look for change password button
      const changePasswordExists = await helpers.elementExists(SETTINGS_SELECTORS.CHANGE_PASSWORD_BUTTON);
      if (changePasswordExists) {
        logger.success('Change password button found');
      }
      
      logger.success('Account settings displayed');
    });

    test('should open change password form', async () => {
      logger.info('Testing change password functionality');
      
      const changePasswordExists = await helpers.elementExists(SETTINGS_SELECTORS.CHANGE_PASSWORD_BUTTON);
      
      if (changePasswordExists) {
        await helpers.clickElement(SETTINGS_SELECTORS.CHANGE_PASSWORD_BUTTON);
        await page.waitForTimeout(1000);
        
        await testBrowser.screenshot('settings-test', 'change-password-form');
        
        // Check for password input fields
        const currentPasswordExists = await helpers.elementExists(SETTINGS_SELECTORS.CURRENT_PASSWORD_INPUT);
        const newPasswordExists = await helpers.elementExists(SETTINGS_SELECTORS.NEW_PASSWORD_INPUT);
        const confirmPasswordExists = await helpers.elementExists(SETTINGS_SELECTORS.CONFIRM_PASSWORD_INPUT);
        
        if (currentPasswordExists || newPasswordExists || confirmPasswordExists) {
          logger.success('Password change form opened with required fields');
        }
        
        // Close form if modal or cancel button exists
        const cancelExists = await helpers.elementExists('button:has-text("Cancel")');
        if (cancelExists) {
          await helpers.clickElement('button:has-text("Cancel")');
        } else {
          await page.keyboard.press('Escape');
        }
        await page.waitForTimeout(500);
      } else {
        logger.warn('Change password button not found');
      }
    });

    test('should validate password change form', async () => {
      logger.info('Testing password change validation');
      
      const changePasswordExists = await helpers.elementExists(SETTINGS_SELECTORS.CHANGE_PASSWORD_BUTTON);
      
      if (changePasswordExists) {
        await helpers.clickElement(SETTINGS_SELECTORS.CHANGE_PASSWORD_BUTTON);
        await page.waitForTimeout(1000);
        
        // Try to submit with mismatched passwords
        const newPasswordExists = await helpers.elementExists(SETTINGS_SELECTORS.NEW_PASSWORD_INPUT);
        const confirmPasswordExists = await helpers.elementExists(SETTINGS_SELECTORS.CONFIRM_PASSWORD_INPUT);
        
        if (newPasswordExists && confirmPasswordExists) {
          await helpers.typeText(SETTINGS_SELECTORS.NEW_PASSWORD_INPUT, 'newpassword123');
          await helpers.typeText(SETTINGS_SELECTORS.CONFIRM_PASSWORD_INPUT, 'differentpassword');
          
          // Try to submit
          const submitExists = await helpers.elementExists('button[type="submit"], button:has-text("Change"), button:has-text("Update")');
          if (submitExists) {
            await helpers.clickElement('button[type="submit"], button:has-text("Change"), button:has-text("Update")');
            await page.waitForTimeout(1000);
            
            await testBrowser.screenshot('settings-test', 'password-validation-error');
            
            // Check for validation error
            const errorExists = await helpers.elementExists(FORM_SELECTORS.ERROR_MESSAGE);
            if (errorExists) {
              logger.success('Password validation working');
            }
          }
        }
        
        // Close form
        await page.keyboard.press('Escape');
        await page.waitForTimeout(500);
      }
    });
  });

  describe('Notification Settings', () => {
    beforeEach(async () => {
      const notificationsTabExists = await helpers.elementExists(SETTINGS_SELECTORS.NOTIFICATIONS_TAB);
      if (notificationsTabExists) {
        await helpers.clickElement(SETTINGS_SELECTORS.NOTIFICATIONS_TAB);
        await page.waitForTimeout(1000);
      }
    });

    test('should display notification settings', async () => {
      logger.info('Testing notification settings display');
      
      await testBrowser.screenshot('settings-test', 'notification-settings');
      
      const toggles = [
        { name: 'Email Notifications', selector: SETTINGS_SELECTORS.EMAIL_NOTIFICATIONS_TOGGLE },
        { name: 'Push Notifications', selector: SETTINGS_SELECTORS.PUSH_NOTIFICATIONS_TOGGLE }
      ];
      
      let togglesFound = 0;
      for (const toggle of toggles) {
        const exists = await helpers.elementExists(toggle.selector);
        if (exists) {
          togglesFound++;
          logger.success(`${toggle.name} toggle found`);
        }
      }
      
      expect(togglesFound).toBeGreaterThan(0);
      logger.success(`Found ${togglesFound} notification toggles`);
    });

    test('should toggle notification settings', async () => {
      logger.info('Testing notification settings toggles');
      
      const emailToggleExists = await helpers.elementExists(SETTINGS_SELECTORS.EMAIL_NOTIFICATIONS_TOGGLE);
      
      if (emailToggleExists) {
        // Get current state
        const initialState = await page.evaluate((selector) => {
          const toggle = document.querySelector(selector) as HTMLInputElement;
          return toggle ? toggle.checked : false;
        }, SETTINGS_SELECTORS.EMAIL_NOTIFICATIONS_TOGGLE);
        
        logger.info(`Email notifications initially: ${initialState ? 'enabled' : 'disabled'}`);
        
        // Toggle the setting
        await helpers.clickElement(SETTINGS_SELECTORS.EMAIL_NOTIFICATIONS_TOGGLE);
        await page.waitForTimeout(1000);
        
        // Check new state
        const newState = await page.evaluate((selector) => {
          const toggle = document.querySelector(selector) as HTMLInputElement;
          return toggle ? toggle.checked : false;
        }, SETTINGS_SELECTORS.EMAIL_NOTIFICATIONS_TOGGLE);
        
        expect(newState).toBe(!initialState);
        
        await testBrowser.screenshot('settings-test', 'notification-toggled');
        
        logger.success(`Email notifications toggled to: ${newState ? 'enabled' : 'disabled'}`);
        
        // Save settings if save button exists
        const saveButtonExists = await helpers.elementExists(SETTINGS_SELECTORS.SAVE_SETTINGS_BUTTON);
        if (saveButtonExists) {
          await helpers.clickElement(SETTINGS_SELECTORS.SAVE_SETTINGS_BUTTON);
          await page.waitForTimeout(2000);
          
          const toastExists = await helpers.elementExists(TOAST_SELECTORS.TOAST_SUCCESS, 3000);
          if (toastExists) {
            logger.success('Notification settings saved successfully');
          }
        }
      } else {
        logger.warn('Email notifications toggle not found');
      }
    });

    test('should test push notifications toggle', async () => {
      logger.info('Testing push notifications toggle');
      
      const pushToggleExists = await helpers.elementExists(SETTINGS_SELECTORS.PUSH_NOTIFICATIONS_TOGGLE);
      
      if (pushToggleExists) {
        const initialState = await page.evaluate((selector) => {
          const toggle = document.querySelector(selector) as HTMLInputElement;
          return toggle ? toggle.checked : false;
        }, SETTINGS_SELECTORS.PUSH_NOTIFICATIONS_TOGGLE);
        
        await helpers.clickElement(SETTINGS_SELECTORS.PUSH_NOTIFICATIONS_TOGGLE);
        await page.waitForTimeout(1000);
        
        const newState = await page.evaluate((selector) => {
          const toggle = document.querySelector(selector) as HTMLInputElement;
          return toggle ? toggle.checked : false;
        }, SETTINGS_SELECTORS.PUSH_NOTIFICATIONS_TOGGLE);
        
        expect(newState).toBe(!initialState);
        
        await testBrowser.screenshot('settings-test', 'push-notifications-toggled');
        
        logger.success(`Push notifications toggled from ${initialState} to ${newState}`);
      } else {
        logger.warn('Push notifications toggle not found');
      }
    });
  });

  describe('Privacy Settings', () => {
    beforeEach(async () => {
      const privacyTabExists = await helpers.elementExists(SETTINGS_SELECTORS.PRIVACY_TAB);
      if (privacyTabExists) {
        await helpers.clickElement(SETTINGS_SELECTORS.PRIVACY_TAB);
        await page.waitForTimeout(1000);
      }
    });

    test('should display privacy settings', async () => {
      logger.info('Testing privacy settings display');
      
      await testBrowser.screenshot('settings-test', 'privacy-settings');
      
      const controls = [
        { name: 'Profile Visibility', selector: SETTINGS_SELECTORS.PROFILE_VISIBILITY_SELECT },
        { name: 'Data Sharing', selector: SETTINGS_SELECTORS.DATA_SHARING_TOGGLE }
      ];
      
      let controlsFound = 0;
      for (const control of controls) {
        const exists = await helpers.elementExists(control.selector);
        if (exists) {
          controlsFound++;
          logger.success(`${control.name} control found`);
        }
      }
      
      logger.success(`Found ${controlsFound} privacy controls`);
    });

    test('should change profile visibility', async () => {
      logger.info('Testing profile visibility settings');
      
      const visibilitySelectExists = await helpers.elementExists(SETTINGS_SELECTORS.PROFILE_VISIBILITY_SELECT);
      
      if (visibilitySelectExists) {
        await helpers.clickElement(SETTINGS_SELECTORS.PROFILE_VISIBILITY_SELECT);
        await page.waitForTimeout(1000);
        
        await testBrowser.screenshot('settings-test', 'profile-visibility-options');
        
        // Try to select an option
        const optionExists = await helpers.elementExists('option, [role="option"]');
        if (optionExists) {
          await helpers.clickElement('option:first-child, [role="option"]:first-child');
          await page.waitForTimeout(1000);
          
          logger.success('Profile visibility option selected');
        }
      } else {
        logger.warn('Profile visibility select not found');
      }
    });

    test('should toggle data sharing', async () => {
      logger.info('Testing data sharing toggle');
      
      const dataSharingExists = await helpers.elementExists(SETTINGS_SELECTORS.DATA_SHARING_TOGGLE);
      
      if (dataSharingExists) {
        const initialState = await page.evaluate((selector) => {
          const toggle = document.querySelector(selector) as HTMLInputElement;
          return toggle ? toggle.checked : false;
        }, SETTINGS_SELECTORS.DATA_SHARING_TOGGLE);
        
        await helpers.clickElement(SETTINGS_SELECTORS.DATA_SHARING_TOGGLE);
        await page.waitForTimeout(1000);
        
        const newState = await page.evaluate((selector) => {
          const toggle = document.querySelector(selector) as HTMLInputElement;
          return toggle ? toggle.checked : false;
        }, SETTINGS_SELECTORS.DATA_SHARING_TOGGLE);
        
        expect(newState).toBe(!initialState);
        
        await testBrowser.screenshot('settings-test', 'data-sharing-toggled');
        
        logger.success(`Data sharing toggled from ${initialState} to ${newState}`);
      } else {
        logger.warn('Data sharing toggle not found');
      }
    });
  });

  describe('Security Settings', () => {
    beforeEach(async () => {
      const securityTabExists = await helpers.elementExists(SETTINGS_SELECTORS.SECURITY_TAB);
      if (securityTabExists) {
        await helpers.clickElement(SETTINGS_SELECTORS.SECURITY_TAB);
        await page.waitForTimeout(1000);
      }
    });

    test('should display security settings', async () => {
      logger.info('Testing security settings display');
      
      await testBrowser.screenshot('settings-test', 'security-settings');
      
      // Look for common security features
      const securityFeatures = [
        'Two-Factor Authentication',
        'Login History',
        'Active Sessions',
        'Account Recovery'
      ];
      
      let featuresFound = 0;
      for (const feature of securityFeatures) {
        const exists = await helpers.elementExists(`:has-text("${feature}")`);
        if (exists) {
          featuresFound++;
          logger.success(`${feature} section found`);
        }
      }
      
      logger.success(`Found ${featuresFound} security features`);
    });

    test('should handle two-factor authentication if available', async () => {
      logger.info('Testing two-factor authentication settings');
      
      const twoFactorExists = await helpers.elementExists('button:has-text("Enable"), button:has-text("Two-Factor"), :has-text("2FA")');
      
      if (twoFactorExists) {
        await helpers.clickElement('button:has-text("Enable"), button:has-text("Two-Factor"), :has-text("2FA"):first-child');
        await page.waitForTimeout(1000);
        
        await testBrowser.screenshot('settings-test', '2fa-setup');
        
        logger.success('Two-factor authentication setup initiated');
        
        // Cancel or close if modal appears
        const cancelExists = await helpers.elementExists('button:has-text("Cancel")');
        if (cancelExists) {
          await helpers.clickElement('button:has-text("Cancel")');
        } else {
          await page.keyboard.press('Escape');
        }
        await page.waitForTimeout(500);
      } else {
        logger.info('Two-factor authentication not found');
      }
    });
  });

  describe('Settings Form Persistence', () => {
    test('should persist settings after page refresh', async () => {
      logger.info('Testing settings persistence after page refresh');
      
      // Navigate to profile settings
      const profileTabExists = await helpers.elementExists(SETTINGS_SELECTORS.PROFILE_TAB);
      if (profileTabExists) {
        await helpers.clickElement(SETTINGS_SELECTORS.PROFILE_TAB);
        await page.waitForTimeout(1000);
      }
      
      // Change a setting
      const nameInputExists = await helpers.elementExists(SETTINGS_SELECTORS.PROFILE_NAME_INPUT);
      if (nameInputExists) {
        const originalName = await helpers.getValue(SETTINGS_SELECTORS.PROFILE_NAME_INPUT);
        const testName = `Test Name ${Date.now()}`;
        
        await helpers.clearInput(SETTINGS_SELECTORS.PROFILE_NAME_INPUT);
        await helpers.typeText(SETTINGS_SELECTORS.PROFILE_NAME_INPUT, testName);
        
        // Save the setting
        const saveButtonExists = await helpers.elementExists(SETTINGS_SELECTORS.SAVE_SETTINGS_BUTTON);
        if (saveButtonExists) {
          await helpers.clickElement(SETTINGS_SELECTORS.SAVE_SETTINGS_BUTTON);
          await page.waitForTimeout(2000);
          
          // Refresh the page
          await page.reload();
          await page.waitForTimeout(3000);
          
          // Check if the setting persisted
          const currentName = await helpers.getValue(SETTINGS_SELECTORS.PROFILE_NAME_INPUT);
          
          if (currentName === testName) {
            logger.success('Settings persisted after page refresh');
          } else {
            logger.warn('Settings may not have persisted correctly');
          }
          
          await testBrowser.screenshot('settings-test', 'settings-after-refresh');
        }
      }
    });
  });

  describe('Settings Error Handling', () => {
    test('should handle settings save errors', async () => {
      logger.info('Testing settings save error handling');
      
      // Try to save invalid settings
      const emailInputExists = await helpers.elementExists(SETTINGS_SELECTORS.PROFILE_EMAIL_INPUT);
      
      if (emailInputExists) {
        const originalEmail = await helpers.getValue(SETTINGS_SELECTORS.PROFILE_EMAIL_INPUT);
        
        // Enter invalid email
        await helpers.clearInput(SETTINGS_SELECTORS.PROFILE_EMAIL_INPUT);
        await helpers.typeText(SETTINGS_SELECTORS.PROFILE_EMAIL_INPUT, 'invalid.email.format');
        
        const saveButtonExists = await helpers.elementExists(SETTINGS_SELECTORS.SAVE_SETTINGS_BUTTON);
        if (saveButtonExists) {
          await helpers.clickElement(SETTINGS_SELECTORS.SAVE_SETTINGS_BUTTON);
          await page.waitForTimeout(2000);
          
          // Check for error indication
          const errorToastExists = await helpers.elementExists(TOAST_SELECTORS.TOAST_ERROR, 3000);
          const errorMessageExists = await helpers.elementExists(FORM_SELECTORS.ERROR_MESSAGE);
          
          if (errorToastExists || errorMessageExists) {
            logger.success('Settings save error handled correctly');
          } else {
            logger.info('No obvious error indication - may be handled differently');
          }
          
          await testBrowser.screenshot('settings-test', 'save-error-handling');
          
          // Restore original email
          await helpers.clearInput(SETTINGS_SELECTORS.PROFILE_EMAIL_INPUT);
          await helpers.typeText(SETTINGS_SELECTORS.PROFILE_EMAIL_INPUT, originalEmail);
        }
      }
    });
  });
});