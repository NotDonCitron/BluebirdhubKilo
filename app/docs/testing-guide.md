# Testing Guide for AbacusHub

## Overview

This guide documents the testing patterns, utilities, and best practices established for the AbacusHub Next.js application. Our testing strategy covers component testing, integration testing, and end-to-end testing with a focus on reliability and maintainability.

## Testing Architecture

### Test Types and Coverage

1. **Component Tests** (Jest + React Testing Library)
   - UI component behavior and rendering
   - User interactions and state changes
   - Props validation and event handling
   - Current Status: ✅ 75%+ pass rate

2. **Integration Tests** (Jest + Puppeteer)
   - Multi-component workflows
   - API integration testing
   - Cross-module functionality
   - Current Status: ⚠️ Infrastructure ready, auth issues blocking

3. **E2E Tests** (Puppeteer)
   - Complete user journeys
   - Browser compatibility
   - Visual regression testing
   - Current Status: ⚠️ Infrastructure ready, auth issues blocking

## Project Structure

```
app/
├── __tests__/
│   ├── components/           # Component-specific tests
│   │   └── dashboard/
│   │       └── settings/     # Settings page components
│   └── utils/
│       └── test-mocks.ts     # Centralized mock utilities
├── tests/
│   ├── e2e/                  # End-to-end test files
│   │   ├── setup.ts         # Puppeteer configuration
│   │   └── *.test.ts        # E2E test suites
│   └── utils/
│       ├── helpers.ts       # E2E test helpers
│       └── selectors.ts     # Element selectors
├── jest.config.js           # Jest configuration
├── jest.setup.js           # Global test setup
└── jest.e2e.config.js      # E2E-specific Jest config
```

## Component Testing Patterns

### 1. Basic Test Structure

```typescript
import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import { ComponentName } from '@/components/path/to/component';
import { 
  setupComponentMocks,
  createSessionMock,
  mockDataSet
} from '@/__tests__/utils/test-mocks';

describe('ComponentName', () => {
  const mockFetch = jest.fn();
  
  beforeEach(() => {
    global.fetch = mockFetch;
    setupComponentMocks(mockFetch);
    jest.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders component correctly', async () => {
    await act(async () => {
      render(<ComponentName />);
    });
    
    await waitFor(() => {
      expect(screen.getByTestId('component-root')).toBeInTheDocument();
    });
  });
});
```

### 2. Test-ID Conventions

**Pattern**: `data-testid="component-element-purpose"`

```typescript
// Good examples
data-testid="account-settings"                    // Main component
data-testid="email-notifications-switch"         // Specific control
data-testid="save-preferences-button"           // Action button
data-testid="terminate-sessions-trigger"        // Dialog trigger
data-testid="delete-account-confirm"            // Confirmation action

// Avoid
data-testid="button1"                           // Non-descriptive
data-testid="switch"                            // Too generic
data-testid="accountSettingsEmailInput"        // camelCase (use kebab-case)
```

### 3. Async Testing Patterns

```typescript
// Use act() for state changes
await act(async () => {
  render(<Component />);
});

// Use waitFor() for async operations
await waitFor(() => {
  expect(screen.getByText('Expected Text')).toBeInTheDocument();
});

// Use user interaction helpers
const user = userEvent.setup();
await user.click(screen.getByTestId('button'));
```

### 4. Mock Management

#### Using the Centralized Mock Utility

```typescript
import { 
  setupAccountSettingsMocks,
  setupNotificationSettingsMocks,
  createSuccessResponse,
  createErrorResponse,
  mockAccountInfo,
  createSessionMock
} from '@/__tests__/utils/test-mocks';

// Setup successful API responses
setupAccountSettingsMocks(mockFetch);

// Create custom responses
mockFetch.mockResolvedValueOnce(createSuccessResponse({ data: 'custom' }));
mockFetch.mockResolvedValueOnce(createErrorResponse(404, 'Not Found'));

// Use predefined mock data
expect(response).toEqual(mockAccountInfo);
```

#### Available Mock Utilities

```typescript
// Data Mocks
mockAccountInfo           // User account information
mockSecuritySettings      // Security preferences
mockPrivacySettings      // Privacy configuration
mockNotificationSettings // Notification preferences
mockActivityLogs         // Activity history
mockWorkspaces          // Workspace data
mockTasks              // Task information
mockFiles             // File metadata

// Response Factories
createSuccessResponse<T>(data: T)                    // HTTP 200 response
createErrorResponse(status: number, message: string) // Error response
createNetworkError(message: string)                 // Network failure

// Setup Functions
setupAccountSettingsMocks(mockFetch)     // Account page mocks
setupPrivacySettingsMocks(mockFetch)     // Privacy page mocks
setupNotificationSettingsMocks(mockFetch) // Notification page mocks
setupWorkspacesMocks(mockFetch)          // Workspace mocks
setupTasksMocks(mockFetch)               // Task mocks
setupFilesMocks(mockFetch)               // File mocks

// Session Mocks
createSessionMock(overrides?: Partial<Session>)  // Authenticated session
createUnauthenticatedSessionMock()               // Not logged in
createLoadingSessionMock()                       // Loading state

// Browser API Mocks
setupFileUploadMocks()    // File and FileReader mocks
setupEventSourceMock()    // Server-Sent Events mock
createToastMocks()        // Toast notification mocks
```

## Component-Specific Testing

### Settings Components

#### Account Settings
- **Focus**: User account information, security settings, activity logs
- **Key Tests**: Data loading, form interactions, API error handling
- **Status**: ✅ 11/11 tests passing

```typescript
it('handles session termination dialog', async () => {
  setupAccountSettingsMocks(mockFetch);
  
  await act(async () => {
    render(<AccountSettings />);
  });
  
  await waitFor(() => {
    expect(screen.getByTestId('terminate-sessions-trigger')).toBeInTheDocument();
  });
});
```

#### Privacy Settings
- **Focus**: Visibility settings, data export, privacy controls
- **Key Tests**: Select components, switch toggles, form submission
- **Status**: ✅ Previously working

#### Notification Settings
- **Focus**: Email, push, and desktop notification preferences
- **Key Tests**: Switch interactions, time inputs, frequency selection
- **Status**: ⚠️ Minor issues with switch state testing

```typescript
it('toggles notification settings', async () => {
  const user = userEvent.setup();
  render(<NotificationSettings />);
  
  await waitFor(() => {
    expect(screen.getByText('Delivery Methods')).toBeInTheDocument();
  });

  const emailToggle = screen.getByTestId('email-notifications-switch');
  await user.click(emailToggle);

  expect(emailToggle).not.toBeChecked();
});
```

## Mock Patterns

### 1. Radix UI Component Mocks

Our `jest.setup.js` includes comprehensive mocks for Radix UI components:

```typescript
const createMockComponent = (displayName) => {
  const MockComponent = React.forwardRef((props, ref) => {
    const { asChild, onValueChange, onCheckedChange, ...domProps } = props;
    return React.createElement('div', { ...domProps, ref, children: props.children });
  });
  MockComponent.displayName = displayName;
  return MockComponent;
};

jest.mock('@radix-ui/react-select', () => ({
  Root: createMockComponent('SelectRoot'),
  Trigger: createMockComponent('SelectTrigger'),
  Content: createMockComponent('SelectContent'),
  // ... more components
}));
```

### 2. NextAuth Mocking

```typescript
jest.mock('next-auth/react');
const mockUseSession = useSession as jest.MockedFunction<typeof useSession>;

beforeEach(() => {
  mockUseSession.mockReturnValue(createSessionMock());
});
```

### 3. API Response Mocking

```typescript
// Success response
mockFetch.mockResolvedValueOnce({
  ok: true,
  json: () => Promise.resolve(mockData)
});

// Error response
mockFetch.mockResolvedValueOnce({
  ok: false,
  status: 500,
  json: () => Promise.resolve({ error: 'Server error' })
});

// Network error
mockFetch.mockRejectedValueOnce(new Error('Network error'));
```

## E2E Testing (Puppeteer)

### Configuration

#### Puppeteer Setup (`tests/e2e/setup.ts`)

```typescript
const browser = await puppeteer.launch({
  headless: process.env.HEADLESS !== 'false',
  pipe: true,  // Fixes WebSocket issues
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu',
    '--no-first-run'
  ]
});
```

### Helper Functions

#### Navigation and Interaction
```typescript
// Navigate to page
await helpers.navigateTo('/dashboard/settings');

// Fill form
await helpers.fillForm({
  [AUTH_SELECTORS.EMAIL_INPUT]: 'test@example.com',
  [AUTH_SELECTORS.PASSWORD_INPUT]: 'password'
});

// Submit and wait
await helpers.submitForm();
await helpers.waitForNavigation('/dashboard');
```

#### Element Testing
```typescript
// Check element existence
const exists = await helpers.elementExists('[data-testid="component"]');

// Wait for text
await helpers.waitForText('Expected content');

// Click by text content
await helpers.clickElementByText('Save Changes');
```

## Common Issues and Solutions

### 1. React Testing Library Warnings

**Issue**: "An update to Component inside a test was not wrapped in act(...)"

**Solution**: Wrap async operations in `act()`
```typescript
await act(async () => {
  render(<Component />);
});
```

### 2. Radix UI Component Testing

**Issue**: Props like `asChild`, `onValueChange` causing DOM warnings

**Solution**: Filter props in mock components
```typescript
const { asChild, onValueChange, onCheckedChange, ...domProps } = props;
return React.createElement('div', { ...domProps, ref });
```

### 3. Switch Component Testing

**Issue**: Radix Switch components not responding to `toBeChecked()`

**Solution**: Use `aria-checked` attribute or test-specific implementations
```typescript
expect(screen.getByTestId('switch')).toHaveAttribute('aria-checked', 'true');
```

### 4. Duplicate Element Selection

**Issue**: "Found multiple elements with the role 'button'"

**Solution**: Use specific `data-testid` attributes
```typescript
// Instead of role-based selection
screen.getByRole('button', { name: /save/i })

// Use test-id
screen.getByTestId('save-button')
```

## Test Commands

### Component Tests
```bash
# Run all tests
npm run test

# Run specific test file
npm run test -- ComponentName.test.tsx

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

### E2E Tests
```bash
# Run all E2E tests
npm run test:e2e

# Run specific E2E test suite
npm run test:e2e:auth
npm run test:e2e:dashboard
npm run test:e2e:settings

# Run in headless mode
npm run test:e2e:headless

# Run integration test runner
npm run test:e2e:runner
```

## Best Practices

### 1. Test Organization
- Group related tests in `describe` blocks
- Use descriptive test names that explain the behavior
- Follow AAA pattern: Arrange, Act, Assert

### 2. Mock Usage
- Use the centralized mock utility to reduce duplication
- Mock at the API boundary, not internal functions
- Reset mocks between tests

### 3. Selector Strategy
- Prefer `data-testid` over role-based selectors for complex components
- Use semantic HTML and ARIA roles where appropriate
- Avoid brittle CSS class or text-based selectors

### 4. Async Testing
- Always use `waitFor` for async operations
- Use `act` for state changes
- Set appropriate timeouts for slow operations

### 5. Error Testing
- Test both success and error scenarios
- Verify error messages and user feedback
- Test network failures and API errors

## Performance Considerations

### 1. Test Execution Speed
- Use `jest.useFakeTimers()` for time-dependent tests
- Mock heavy dependencies (file uploads, network requests)
- Run tests in parallel where possible

### 2. Memory Management
- Clean up event listeners and timers
- Use `cleanup()` in `afterEach` blocks
- Avoid memory leaks in long-running test suites

## Debugging Tests

### 1. Component Tests
```typescript
// Add debug output
screen.debug(); // Prints current DOM

// Check what's rendered
console.log(screen.getByTestId('component').innerHTML);

// Use specific queries
screen.getByRole('button', { name: /exact text/i });
```

### 2. E2E Tests
```typescript
// Take screenshots on failure
await page.screenshot({ path: 'error.png' });

// Log console messages
page.on('console', msg => console.log('Browser:', msg.text()));

// Monitor network requests
page.on('request', request => console.log('Request:', request.url()));
```

## Continuous Integration

### GitHub Actions Integration
```yaml
- name: Run Tests
  run: |
    npm run test:coverage
    npm run test:e2e:headless
```

### Coverage Reporting
- Minimum coverage: 80% for new components
- Critical paths: 95% coverage required
- Generated reports: `coverage/lcov-report/index.html`

---

**Document Version**: 1.0  
**Last Updated**: 2025-07-07  
**Maintained By**: Development Team