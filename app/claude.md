# AbacusHub Testing Documentation

## Project Overview

AbacusHub is a comprehensive workspace and task management application with a robust end-to-end testing suite built with Puppeteer and Jest. This document provides complete guidance for understanding, running, and maintaining the test infrastructure.

## Testing Architecture

### Technology Stack
- **Test Framework**: Jest
- **Browser Automation**: Puppeteer
- **Test Structure**: Page Object Model pattern
- **Test Utilities**: Custom helpers and selectors
- **Reporting**: jest-html-reporters

### Test Suite Organization

```
app/tests/
├── e2e/                    # End-to-end test files
│   ├── auth.test.ts       # Authentication tests
│   ├── dashboard.test.ts  # Dashboard navigation tests
│   ├── workspaces.test.ts # Workspace CRUD operations
│   ├── tasks.test.ts      # Task management tests
│   ├── files.test.ts      # File upload/management tests
│   ├── settings.test.ts   # Settings and preferences
│   ├── responsive.test.ts # Responsive design tests
│   ├── interactions.test.ts # UI interaction tests
│   ├── integration.test.ts # Cross-module workflows
│   └── setup.ts           # Global test configuration
├── utils/                 # Test utilities
│   ├── helpers.ts         # Reusable test functions
│   └── selectors.ts       # CSS selectors for UI elements
└── run-tests.ts          # Test runner script
```

## Running Tests

### Prerequisites
1. Development server must be running: `npm run dev`
2. Application accessible at http://localhost:3000
3. Database with test user seeded

### Test Commands

```bash
# Run all E2E tests
npm run test:e2e

# Run specific test suite
npm run test:e2e:auth          # Authentication tests only
npm run test:e2e:workspaces    # Workspace tests only
npm run test:e2e:tasks         # Task tests only
npm run test:e2e:files         # File tests only
npm run test:e2e:settings      # Settings tests only
npm run test:e2e:responsive    # Responsive tests only
npm run test:e2e:interactions  # Interaction tests only
npm run test:e2e:integration   # Integration tests only

# Run tests in headless mode
npm run test:e2e:headless

# Run test runner with options
npm run test:e2e:runner
npm run test:e2e:runner -- --test=auth
npm run test:e2e:runner -- --headless
npm run test:e2e:runner -- --verbose
```

### Test Configuration

**Test Credentials:**
- Email: `john@doe.com`
- Password: `johndoe123`

**Environment Variables:**
- `BASE_URL`: Application URL (default: http://localhost:3000)
- `HEADLESS`: Run tests without browser UI (default: false)
- `VERBOSE`: Enable detailed logging (default: false)

## Test Coverage

### Authentication Module
- ✓ Login with valid credentials
- ✓ Login with invalid credentials
- ✓ Empty form validation
- ✓ Session persistence
- ✓ Logout functionality
- ✓ Protected route access
- ✓ Password field security
- ✓ Remember me functionality

### Workspace Management
- ✓ Create new workspace
- ✓ Edit workspace details
- ✓ Delete workspace
- ✓ List all workspaces
- ✓ Search workspaces
- ✓ Workspace permissions
- ✓ Workspace sharing
- ✓ Workspace archiving

### Task Management
- ✓ Create tasks within workspace
- ✓ Edit task details
- ✓ Delete tasks
- ✓ Task status updates
- ✓ Task filtering
- ✓ Task assignment
- ✓ Due date management
- ✓ Task priorities

### File Management
- ✓ File upload
- ✓ File preview
- ✓ File download
- ✓ File deletion
- ✓ File organization
- ✓ File size validation
- ✓ File type restrictions
- ✓ Bulk operations

### Settings & Preferences
- ✓ Profile updates
- ✓ Password changes
- ✓ Notification preferences
- ✓ Theme selection
- ✓ Language settings
- ✓ Account deletion
- ✓ Data export
- ✓ Privacy settings

### Responsive Design
- ✓ Mobile viewport (375px)
- ✓ Tablet viewport (768px)
- ✓ Desktop viewport (1024px+)
- ✓ Touch interactions
- ✓ Responsive navigation
- ✓ Form adaptability
- ✓ Image scaling
- ✓ Table responsiveness

### Cross-Module Integration
- ✓ Workspace → Task workflow
- ✓ Task → File attachment
- ✓ Multi-module navigation
- ✓ Data persistence across modules
- ✓ State management
- ✓ Error propagation
- ✓ Transaction handling

## Troubleshooting

### Common Issues and Solutions

#### Tests Failing to Connect
**Issue**: Tests fail with connection refused error
**Solution**:
1. Verify dev server is running on port 3000
2. Check BASE_URL in test configuration
3. Ensure no firewall blocking local connections

#### Authentication Failures
**Issue**: Login tests fail with invalid credentials
**Solution**:
1. Verify test user exists in database
2. Run database seed: `npm run db:seed`
3. Check password hashing configuration

#### Timeout Errors
**Issue**: Tests timeout before completion
**Solution**:
1. Increase test timeout in jest.e2e.config.js
2. Check for slow network requests
3. Optimize database queries
4. Add explicit waits for dynamic content

#### Flaky Tests
**Issue**: Tests pass/fail inconsistently
**Solution**:
1. Add proper wait conditions
2. Use data-testid attributes
3. Avoid timing-based assertions
4. Clear test data between runs

### Debug Mode

Enable verbose logging for troubleshooting:
```bash
VERBOSE=true npm run test:e2e:auth
```

Take screenshots on failure:
```javascript
// Automatically captures screenshots in tests/reports/screenshots/
```

## Best Practices

### Writing New Tests

1. **Use Page Object Model**
   ```typescript
   // Use helpers instead of direct page manipulation
   await helpers.login();
   await helpers.createWorkspace('Test Workspace');
   ```

2. **Use Semantic Selectors**
   ```typescript
   // Good: Use data-testid or semantic selectors
   await page.click(SELECTORS.WORKSPACE.CREATE_BUTTON);
   
   // Avoid: Brittle selectors
   await page.click('.btn-primary:nth-child(2)');
   ```

3. **Clean Test Data**
   ```typescript
   afterEach(async () => {
     await helpers.cleanupTestData();
   });
   ```

4. **Explicit Waits**
   ```typescript
   // Wait for specific conditions
   await helpers.waitForElement(SELECTORS.WORKSPACE.LIST);
   ```

### Maintaining Tests

1. **Regular Updates**
   - Update selectors when UI changes
   - Review and refactor test helpers
   - Keep dependencies updated

2. **Performance Monitoring**
   - Track test execution time
   - Optimize slow tests
   - Parallelize where possible

3. **Coverage Goals**
   - Maintain >80% code coverage
   - Focus on critical user paths
   - Include edge cases

## CI/CD Integration

### GitHub Actions Workflow
```yaml
name: E2E Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - run: npm install
      - run: npm run build
      - run: npm run test:e2e:headless
```

### Pre-commit Hooks
```json
{
  "husky": {
    "hooks": {
      "pre-commit": "npm run test:e2e:auth"
    }
  }
}
```

## Test Reporting

### HTML Reports
- Location: `coverage/e2e/html-report/e2e-report.html`
- Contains detailed test results
- Screenshots of failures
- Performance metrics

### Coverage Reports
- Location: `coverage/e2e/`
- Formats: HTML, LCOV, text
- Integration with code coverage tools

## Future Enhancements

1. **Visual Regression Testing**
   - Implement screenshot comparison
   - Track UI changes over time

2. **Performance Testing**
   - Add page load benchmarks
   - Monitor memory usage
   - Track render performance

3. **Accessibility Testing**
   - Automated WCAG compliance checks
   - Keyboard navigation tests
   - Screen reader compatibility

4. **API Testing**
   - Separate API test suite
   - Contract testing
   - Load testing

## Support and Contribution

### Getting Help
- Check this documentation first
- Review test logs for detailed errors
- Contact the development team

### Contributing
1. Write tests for new features
2. Update tests for UI changes
3. Improve test performance
4. Add missing test scenarios

### Code Review Checklist
- [ ] Tests cover all acceptance criteria
- [ ] No hardcoded values
- [ ] Proper error handling
- [ ] Clear test descriptions
- [ ] No test interdependencies

---

This documentation is maintained alongside the codebase. For the latest updates, refer to the test files and configuration in the repository.