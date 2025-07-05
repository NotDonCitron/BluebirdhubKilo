"""Prompts for the Test Debug Agent."""

SYSTEM_PROMPT = """You are an expert test debugging assistant specializing in React, TypeScript, and Jest testing.
Your role is to:
1. Analyze test failures and provide root cause analysis
2. Suggest fixes for common testing issues
3. Ensure best practices in test writing
4. Help with test environment configuration
5. Optimize test performance

You have deep knowledge of:
- React Testing Library and its best practices
- Jest configuration and mocking
- TypeScript type safety in tests
- Async testing patterns
- Test performance optimization
- Common testing pitfalls and their solutions
"""

ERROR_ANALYSIS_PROMPT = """Analyze the following test error:

Error: {error}
File: {file}
Test Content: {test_content}

Please provide:
1. Root cause analysis
2. Specific line(s) causing the issue
3. Explanation of why this error occurs
4. Impact on test reliability
5. Related components that might be affected
"""

FIX_GENERATION_PROMPT = """Based on the error analysis:

Error Type: {error_type}
Affected File: {file}
Likely Causes: {causes}

Generate fixes that:
1. Resolve the immediate error
2. Prevent similar issues in the future
3. Follow React Testing Library best practices
4. Maintain test readability
5. Include proper TypeScript types

Provide both:
- Automated fixes that can be applied programmatically
- Manual fixes that require human intervention
"""

ENV_VALIDATION_PROMPT = """Validate the test environment configuration:

Package.json: {package_json}
Jest Config: {jest_config}
Test Files Count: {test_count}

Check for:
1. Missing or incompatible dependencies
2. Jest configuration issues
3. TypeScript configuration for tests
4. Setup files and test utilities
5. Coverage configuration
6. Module resolution issues

Provide specific recommendations for each issue found.
"""

ACT_WARNING_PROMPT = """Fix React act() warnings in the test file:

File: {file}
Warnings Found: {warnings}

For each warning:
1. Identify the exact location
2. Determine the type of state update
3. Provide the appropriate act() wrapper
4. Consider async operations
5. Suggest waitFor when needed

Ensure fixes:
- Don't break existing functionality
- Follow async/await best practices
- Handle edge cases properly
"""

PERFORMANCE_ANALYSIS_PROMPT = """Analyze test performance issues:

Slow Tests: {slow_tests}
Timeout Errors: {timeout_errors}
Test Patterns: {patterns}

Identify:
1. Tests taking excessive time
2. Unnecessary waits or delays
3. Missing fake timers usage
4. Inefficient queries or assertions
5. Heavy setup/teardown operations

Provide optimization strategies for each issue.
"""

MOCK_ANALYSIS_PROMPT = """Analyze mock consistency and correctness:

Mock Files: {mock_files}
Source Files: {source_files}
Issues Found: {issues}

Check for:
1. Missing mock implementations
2. Outdated mocks not matching source
3. Over-mocking (mocking too much)
4. Under-mocking (missing critical mocks)
5. Mock type mismatches

Suggest improvements for mock organization and maintenance.
"""

COVERAGE_ANALYSIS_PROMPT = """Analyze test coverage data:

Overall Coverage: {overall_coverage}
Uncovered Files: {uncovered_files}
Low Coverage Files: {low_coverage_files}

Provide:
1. Priority list of files needing tests
2. Specific functions/branches missing coverage
3. Test scenarios to improve coverage
4. Balance between coverage and test quality
5. Critical paths that must be tested
"""

INTEGRATION_TEST_PROMPT = """Analyze integration test issues:

Test File: {file}
Dependencies: {dependencies}
API Calls: {api_calls}
State Management: {state_management}

Focus on:
1. Proper mock server setup
2. Async operation handling
3. State synchronization
4. Error boundary testing
5. Real-world scenario coverage
"""

DEBUG_STRATEGY_PROMPT = """Create a debugging strategy for the failing test:

Error: {error}
Test: {test_name}
Previous Attempts: {attempts}

Provide a step-by-step debugging approach:
1. Isolation steps (what to comment out)
2. Console.log placement suggestions
3. Breakpoint recommendations
4. Simplification strategies
5. Alternative testing approaches
"""

BEST_PRACTICES_PROMPT = """Review test file for best practices:

File: {file}
Content: {content}

Check for:
1. Proper test organization (describe blocks)
2. Meaningful test descriptions
3. DRY principle violations
4. Accessibility queries usage
5. Cleanup and isolation
6. Assertion quality
7. Mock usage appropriateness
8. Async handling correctness

Rate each aspect and provide specific improvements.
"""

MIGRATION_PROMPT = """Help migrate tests to newer patterns:

Current Pattern: {current_pattern}
Target Pattern: {target_pattern}
File: {file}

Provide:
1. Step-by-step migration guide
2. Code transformations needed
3. Potential breaking changes
4. Compatibility considerations
5. Rollback strategy if needed
"""

ERROR_PATTERN_PROMPT = """Identify common error patterns across test suite:

Test Results: {test_results}
Error Messages: {error_messages}

Find:
1. Recurring error patterns
2. Systemic issues
3. Configuration problems
4. Environmental dependencies
5. Flaky test indicators

Provide a prioritized fix plan.
"""

ACCESSIBILITY_TEST_PROMPT = """Enhance tests with accessibility checks:

Component: {component}
Current Tests: {current_tests}

Add tests for:
1. ARIA attributes
2. Keyboard navigation
3. Screen reader compatibility
4. Focus management
5. Color contrast (where applicable)

Ensure accessibility best practices in test queries.
"""

SNAPSHOT_ANALYSIS_PROMPT = """Analyze snapshot test issues:

Failed Snapshots: {failed_snapshots}
Component Changes: {changes}

Determine:
1. Intentional vs unintentional changes
2. Snapshot update strategy
3. Snapshot size optimization
4. Dynamic content handling
5. Snapshot maintenance approach

Provide guidance on when to update vs investigate.
"""

CUSTOM_MATCHER_PROMPT = """Create custom Jest matchers for common assertions:

Repeated Patterns: {patterns}
Domain Logic: {domain_logic}

Design matchers that:
1. Improve test readability
2. Provide better error messages
3. Encapsulate complex assertions
4. Are reusable across tests
5. Have TypeScript support

Include implementation and usage examples.
"""

TEST_DATA_PROMPT = """Optimize test data management:

Current Approach: {current_approach}
Data Patterns: {patterns}

Suggest:
1. Test data factory patterns
2. Fixture organization
3. Random data generation strategies
4. Data cleanup approaches
5. Shared test data best practices

Focus on maintainability and reusability.
"""

PARALLEL_TEST_PROMPT = """Optimize tests for parallel execution:

Test Suite: {test_suite}
Current Issues: {issues}

Identify:
1. Tests with shared state
2. Order-dependent tests
3. Resource conflicts
4. Database/file system dependencies
5. Port conflicts

Provide isolation strategies for parallel execution.
"""

FLAKY_TEST_PROMPT = """Diagnose and fix flaky tests:

Test: {test_name}
Failure Rate: {failure_rate}
Error Patterns: {error_patterns}

Investigate:
1. Timing dependencies
2. External service dependencies
3. Random data issues
4. Cleanup problems
5. Race conditions

Provide stabilization strategies.
"""

MEMORY_LEAK_PROMPT = """Detect and fix memory leaks in tests:

Test File: {file}
Memory Usage: {memory_data}

Check for:
1. Unmocked timers
2. Event listener cleanup
3. Large data structures
4. Circular references
5. Global state pollution

Provide cleanup strategies and preventive measures.
"""

INTERFACE_MISMATCH_PROMPT = """Analyze interface mismatches between test mocks and component expectations:

Test File: {file}
Component File: {component_file}
Mock Data: {mock_data}
Component Interfaces: {interfaces}
API Endpoints: {api_endpoints}

Identify:
1. Mock data structure mismatches with component interfaces
2. API endpoint mismatches (generic vs specific)
3. Missing or incorrect property types
4. Date/time format inconsistencies
5. Promise.all pattern issues with multiple API calls

Provide specific fixes for:
- Updating mock data to match component interfaces
- Correcting API endpoint mocks
- Ensuring proper data types and formats
- Handling concurrent API calls properly
"""

COMPONENT_ANALYSIS_PROMPT = """Analyze component file to understand test requirements:

Component File: {component_file}
Content: {content}

Extract:
1. TypeScript interfaces and their properties
2. API endpoints and their expected data structures
3. React hooks being used
4. State management patterns
5. Date/time formatting libraries (date-fns, moment, etc.)
6. Promise.all or concurrent API call patterns

Provide:
- Interface definitions with property types
- API endpoint mappings and expected responses
- Required mock patterns for proper testing
- Date/time formatting requirements
- Async pattern handling recommendations
"""

DATE_FORMATTING_PROMPT = """Fix comprehensive date formatting issues in tests:

Test File: {file}
Date Errors: {date_errors}
Component Uses: {date_libraries}

Address:
1. Invalid date strings causing "Invalid time value" errors
2. Malformed ISO date formats
3. Missing date-fns or moment.js mocking
4. Timezone handling issues
5. Date formatting function mocks

Provide:
- Valid ISO date string replacements
- Proper date library mocking strategies
- Timezone-aware test patterns
- Date formatting function implementations
"""

SELECTOR_IMPROVEMENT_PROMPT = """Improve test selectors for better reliability:

Test File: {file}
Selector Issues: {selector_issues}
Component Structure: {component_structure}

Fix:
1. Role-based selectors that don't match actual DOM structure
2. Generic selectors that should be more specific
3. CSS class vs semantic role selector mismatches
4. Loading state and spinner detection
5. Form element and button selectors

Provide:
- Correct selector patterns for each element type
- Semantic HTML query strategies
- Loading state detection methods
- Accessibility-friendly selector alternatives
"""

PROMISE_ALL_PATTERN_PROMPT = """Fix Promise.all patterns in test mocks:

Test File: {file}
Component API Calls: {api_calls}
Current Mocks: {current_mocks}

Handle:
1. Multiple concurrent API calls in components
2. Fetch mock implementation for multiple endpoints
3. Promise.all response handling
4. Error scenarios with partial failures
5. Loading state management during concurrent calls

Provide:
- Proper fetch.mockImplementation patterns
- Multi-endpoint response mapping
- Error handling strategies
- Loading state test patterns
"""

COMPREHENSIVE_TEST_FIX_PROMPT = """Provide comprehensive fixes for failing test file:

Test File: {file}
Component File: {component_file}
Error Categories: {error_categories}
Interface Issues: {interface_issues}
Date Issues: {date_issues}
Selector Issues: {selector_issues}
Mock Issues: {mock_issues}

Create a complete fix strategy that:
1. Addresses all interface mismatches
2. Fixes date formatting problems
3. Corrects selector issues
4. Updates mock implementations
5. Handles Promise.all patterns
6. Ensures React act() compliance
7. Adds proper cleanup

Provide:
- Step-by-step fix implementation
- Complete updated test file structure
- Mock data aligned with component interfaces
- Proper async handling patterns
"""