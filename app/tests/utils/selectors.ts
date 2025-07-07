// CSS Selectors for all major UI elements across the application

export const AUTH_SELECTORS = {
  // Login page
  LOGIN_FORM: 'form',
  EMAIL_INPUT: 'input[data-testid="login-email-input"], input[type="email"], input[name="email"]',
  PASSWORD_INPUT: 'input[data-testid="login-password-input"], input[type="password"], input[name="password"]',
  LOGIN_BUTTON: 'button[data-testid="login-submit-button"], button[type="submit"]',
  DEMO_LOGIN_BUTTON: 'button[data-testid="demo-login-button"]',
  SIGNUP_LINK: 'a[href="/signup"]',
  
  // Logout
  LOGOUT_BUTTON: 'button[data-testid="logout-button"]',
  USER_MENU: '[data-testid="user-menu"], button[aria-label="User menu"]'
};

export const NAVIGATION_SELECTORS = {
  // Main navigation
  DASHBOARD_LINK: 'a[href="/dashboard"], [data-testid="dashboard-link"]',
  WORKSPACES_LINK: 'a[href="/dashboard/workspaces"], [data-testid="workspaces-link"]',
  TASKS_LINK: 'a[href="/dashboard/tasks"], [data-testid="tasks-link"]',
  FILES_LINK: 'a[href="/dashboard/files"], [data-testid="files-link"]',
  SETTINGS_LINK: 'a[href="/dashboard/settings"], [data-testid="settings-link"]',
  
  // Mobile navigation
  MOBILE_MENU_TRIGGER: 'button[data-testid="mobile-menu"], button[aria-label*="menu" i]',
  MOBILE_MENU: '[data-testid="mobile-menu-content"]',
  
  // Command palette
  COMMAND_TRIGGER: 'button[data-testid="command-trigger"]',
  COMMAND_PALETTE: '[data-testid="command-palette"], [role="dialog"]',
  COMMAND_INPUT: '[data-testid="command-input"], input[placeholder*="Search"]'
};

export const DASHBOARD_SELECTORS = {
  // Dashboard page
  DASHBOARD_CONTAINER: '[data-testid="dashboard"], main',
  WELCOME_MESSAGE: '[data-testid="welcome-message"]',
  STATS_CARDS: '[data-testid="stats-card"]',
  RECENT_ACTIVITY: '[data-testid="recent-activity"]',
  
  // Theme toggle
  THEME_TOGGLE: 'button[data-testid="theme-toggle"], button[aria-label*="theme" i]',
  
  // Notifications
  NOTIFICATIONS_BUTTON: 'button[data-testid="notifications"], button[aria-label*="notification" i]',
  NOTIFICATION_ITEM: '[data-testid="notification-item"]'
};

export const WORKSPACE_SELECTORS = {
  // Workspaces list
  WORKSPACES_CONTAINER: '[data-testid="workspaces-container"]',
  WORKSPACE_CARD: '[data-testid="workspace-card"]',
  CREATE_WORKSPACE_BUTTON: '[data-testid="create-workspace-button"]',
  
  // Create workspace modal
  WORKSPACE_MODAL: '[data-testid="workspace-modal"]',
  WORKSPACE_NAME_INPUT: '[data-testid="workspace-name-input"]',
  WORKSPACE_DESCRIPTION_INPUT: '[data-testid="workspace-description-input"]',
  WORKSPACE_COLOR_PICKER: '[data-testid="color-picker"]',
  WORKSPACE_ICON_PICKER: '[data-testid="icon-picker"]',
  WORKSPACE_SUBMIT_BUTTON: '[data-testid="workspace-submit-button"]',
  
  // Workspace actions
  WORKSPACE_MENU: '[data-testid="workspace-menu"]',
  EDIT_WORKSPACE_BUTTON: 'button[data-testid="edit-workspace"]',
  DELETE_WORKSPACE_BUTTON: 'button[data-testid="delete-workspace"]',
  WORKSPACE_SETTINGS: '[data-testid="workspace-settings"]'
};

export const TASK_SELECTORS = {
  // Tasks page
  TASKS_CONTAINER: '[data-testid="tasks-container"]',
  TASK_ITEM: '[data-testid="task-item"]',
  CREATE_TASK_BUTTON: '[data-testid="create-task"]',
  
  // Task form
  TASK_MODAL: '[data-testid="task-modal"]',
  TASK_TITLE_INPUT: '[data-testid="task-title-input"]',
  TASK_DESCRIPTION_INPUT: '[data-testid="task-description-input"]',
  TASK_PRIORITY_SELECT: '[data-testid="task-priority-select"]',
  TASK_STATUS_SELECT: '[data-testid="task-status-select"]',
  TASK_WORKSPACE_SELECT: '[data-testid="task-workspace-select"]',
  TASK_ASSIGNEE_SELECT: '[data-testid="task-assignee-select"]',
  TASK_DUE_DATE_INPUT: '[data-testid="task-due-date-input"]',
  TASK_SUBMIT_BUTTON: '[data-testid="task-submit-button"]',
  
  // Task actions
  TASK_CHECKBOX: 'input[type="checkbox"][data-testid*="task"]',
  TASK_MENU: '[data-testid="task-menu"]',
  EDIT_TASK_BUTTON: 'button[data-testid="edit-task"]',
  DELETE_TASK_BUTTON: 'button[data-testid="delete-task"]',
  
  // Task filters
  TASK_FILTER_ALL: 'button[data-testid="filter-all"]',
  TASK_FILTER_PENDING: 'button[data-testid="filter-pending"]',
  TASK_FILTER_IN_PROGRESS: 'button[data-testid="filter-in-progress"]',
  TASK_FILTER_COMPLETED: 'button[data-testid="filter-completed"]',
  
  // Task search
  TASK_SEARCH_INPUT: 'input[placeholder*="Search tasks"]'
};

export const FILE_SELECTORS = {
  // Files page
  FILES_CONTAINER: '[data-testid="files-container"]',
  FILE_ITEM: '[data-testid="file-item"]',
  UPLOAD_BUTTON: '[data-testid="upload-button"]',
  UPLOAD_AREA: '[data-testid="upload-area"]',
  FILE_DROP_ZONE: '[data-testid="file-drop-zone"]',
  FILE_INPUT: '[data-testid="file-input"]',
  FILE_WORKSPACE_SELECT: '[data-testid="file-workspace-select"]',
  UPLOAD_PROGRESS: '[data-testid="upload-progress"]',
  UPLOAD_MODAL: '[data-testid="upload-modal"]',
  
  // File actions
  FILE_MENU: '[data-testid="file-menu"]',
  DOWNLOAD_FILE_BUTTON: 'button[data-testid="download-file"]',
  DELETE_FILE_BUTTON: 'button[data-testid="delete-file"]',
  RENAME_FILE_BUTTON: 'button[data-testid="rename-file"]',
  
  // Folder management
  CREATE_FOLDER_BUTTON: 'button[data-testid="create-folder"]',
  FOLDER_ITEM: '[data-testid="folder-item"]',
  FOLDER_NAME_INPUT: 'input[placeholder*="folder name"]',
  
  // File search and filters
  FILE_SEARCH_INPUT: 'input[placeholder*="Search files"]',
  FILE_TYPE_FILTER: '[data-testid="file-type-filter"]',
  FILE_SIZE_FILTER: '[data-testid="file-size-filter"]'
};

export const SETTINGS_SELECTORS = {
  // Settings navigation
  SETTINGS_CONTAINER: '[data-testid="settings-container"]',
  PROFILE_TAB: 'button[data-testid="profile-tab"], a[href*="profile"]',
  ACCOUNT_TAB: 'button[data-testid="account-tab"], a[href*="account"]',
  NOTIFICATIONS_TAB: 'button[data-testid="notifications-tab"], a[href*="notifications"]',
  PRIVACY_TAB: 'button[data-testid="privacy-tab"], a[href*="privacy"]',
  SECURITY_TAB: 'button[data-testid="security-tab"], a[href*="security"]',
  
  // Profile settings
  PROFILE_NAME_INPUT: 'input[name="name"], input[placeholder*="name"]',
  PROFILE_EMAIL_INPUT: 'input[name="email"], input[type="email"]',
  PROFILE_BIO_INPUT: 'textarea[name="bio"], textarea[placeholder*="bio"]',
  PROFILE_AVATAR_UPLOAD: 'input[type="file"][accept*="image"]',
  
  // Account settings
  CHANGE_PASSWORD_BUTTON: 'button[data-testid="change-password"]',
  CURRENT_PASSWORD_INPUT: 'input[name="currentPassword"]',
  NEW_PASSWORD_INPUT: 'input[name="newPassword"]',
  CONFIRM_PASSWORD_INPUT: 'input[name="confirmPassword"]',
  
  // Notifications settings
  EMAIL_NOTIFICATIONS_TOGGLE: 'input[type="checkbox"][name*="email"]',
  PUSH_NOTIFICATIONS_TOGGLE: 'input[type="checkbox"][name*="push"]',
  
  // Privacy settings
  PROFILE_VISIBILITY_SELECT: 'select[name="profileVisibility"]',
  DATA_SHARING_TOGGLE: 'input[type="checkbox"][name*="sharing"]',
  
  // Save buttons
  SAVE_SETTINGS_BUTTON: 'button[data-testid="save-settings"], button[type="submit"]'
};

export const MODAL_SELECTORS = {
  // Generic modal selectors
  MODAL_OVERLAY: '[data-testid="modal-overlay"], .modal-overlay, [role="dialog"]',
  MODAL_CONTAINER: '[data-testid="modal"], .modal, [role="dialog"] > div',
  MODAL_CLOSE_BUTTON: 'button[data-testid="modal-close"], button[aria-label="Close"]',
  MODAL_CANCEL_BUTTON: 'button[data-testid="modal-cancel"]',
  MODAL_CONFIRM_BUTTON: 'button[data-testid="modal-confirm"]',
  
  // Alert dialogs
  ALERT_DIALOG: '[role="alertdialog"]',
  CONFIRMATION_DIALOG: '[data-testid="confirmation-dialog"]'
};

export const FORM_SELECTORS = {
  // Generic form elements
  FORM: 'form',
  INPUT: 'input',
  TEXTAREA: 'textarea',
  SELECT: 'select',
  CHECKBOX: 'input[type="checkbox"]',
  RADIO: 'input[type="radio"]',
  SUBMIT_BUTTON: 'button[type="submit"]',
  RESET_BUTTON: 'button[type="reset"]',
  
  // Form validation
  ERROR_MESSAGE: '[data-testid="error-message"], .error-message, [role="alert"]',
  SUCCESS_MESSAGE: '[data-testid="success-message"], .success-message',
  FIELD_ERROR: '[data-testid*="error"], .field-error'
};

export const TOAST_SELECTORS = {
  // Toast notifications
  TOAST_CONTAINER: '[data-testid="toast-container"], .toast-container',
  TOAST_ITEM: '[data-testid="toast"], .toast',
  TOAST_SUCCESS: '[data-testid="toast-success"], .toast-success',
  TOAST_ERROR: '[data-testid="toast-error"], .toast-error',
  TOAST_WARNING: '[data-testid="toast-warning"], .toast-warning',
  TOAST_CLOSE: 'button[data-testid="toast-close"]'
};

export const LOADING_SELECTORS = {
  // Loading states
  LOADING_SPINNER: '[data-testid="loading"], .loading, .spinner',
  LOADING_SKELETON: '[data-testid="skeleton"], .skeleton',
  LOADING_OVERLAY: '[data-testid="loading-overlay"], .loading-overlay'
};

// Helper function to get selector by data attribute
export const getByTestId = (testId: string): string => {
  return `[data-testid="${testId}"]`;
};

// Helper function to get selector by role
export const getByRole = (role: string, name?: string): string => {
  if (name) {
    return `[role="${role}"][aria-label="${name}"]`;
  }
  return `[role="${role}"]`;
};

// Helper function to get selector by attribute
export const getByAttribute = (attribute: string, value: string): string => {
  return `[${attribute}="${value}"]`;
};