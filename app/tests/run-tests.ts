#!/usr/bin/env npx ts-node

/**
 * AbacusHub E2E Test Runner
 * 
 * This script runs the comprehensive end-to-end test suite that tests
 * every button, form, and function of the AbacusHub application.
 * 
 * Usage:
 *   npx ts-node tests/run-tests.ts
 *   npx ts-node tests/run-tests.ts --test=auth
 *   npx ts-node tests/run-tests.ts --headless
 *   npx ts-node tests/run-tests.ts --help
 */

import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface TestConfig {
  name: string;
  file: string;
  description: string;
}

const tests: TestConfig[] = [
  {
    name: 'auth',
    file: 'auth.test.ts',
    description: 'Authentication flow tests - login, logout, session management'
  },
  {
    name: 'dashboard',
    file: 'dashboard.test.ts',
    description: 'Dashboard navigation and functionality tests'
  },
  {
    name: 'workspaces',
    file: 'workspaces.test.ts',
    description: 'Workspace creation, management, and operations'
  },
  {
    name: 'tasks',
    file: 'tasks.test.ts',
    description: 'Task management, filtering, and CRUD operations'
  },
  {
    name: 'files',
    file: 'files.test.ts',
    description: 'File upload, management, and operations'
  },
  {
    name: 'settings',
    file: 'settings.test.ts',
    description: 'Settings pages and configuration options'
  },
  {
    name: 'responsive',
    file: 'responsive.test.ts',
    description: 'Responsive design across all viewport sizes'
  },
  {
    name: 'interactions',
    file: 'interactions.test.ts',
    description: 'Comprehensive testing of every interactive element'
  }
];

interface RunnerOptions {
  test?: string;
  headless?: boolean;
  help?: boolean;
  verbose?: boolean;
}

function parseArgs(): RunnerOptions {
  const args = process.argv.slice(2);
  const options: RunnerOptions = {};

  for (const arg of args) {
    if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (arg === '--headless') {
      options.headless = true;
    } else if (arg === '--verbose' || arg === '-v') {
      options.verbose = true;
    } else if (arg.startsWith('--test=')) {
      options.test = arg.split('=')[1];
    }
  }

  return options;
}

function showHelp(): void {
  console.log(`
🧪 AbacusHub E2E Test Runner

DESCRIPTION:
  Comprehensive end-to-end test suite that tests every button, form, and function
  of the AbacusHub application using Puppeteer.

USAGE:
  npx ts-node tests/run-tests.ts [OPTIONS]

OPTIONS:
  --test=<name>    Run specific test suite (see available tests below)
  --headless       Run tests in headless mode (no browser window)
  --verbose, -v    Enable verbose output
  --help, -h       Show this help message

AVAILABLE TESTS:
${tests.map(test => `  ${test.name.padEnd(12)} - ${test.description}`).join('\n')}

EXAMPLES:
  npx ts-node tests/run-tests.ts                    # Run all tests
  npx ts-node tests/run-tests.ts --test=auth        # Run only auth tests
  npx ts-node tests/run-tests.ts --headless         # Run all tests headless
  npx ts-node tests/run-tests.ts --test=interactions --verbose

PREREQUISITES:
  1. Development server must be running: npm run dev
  2. Application accessible at http://localhost:3000
  3. Test credentials: john@doe.com / johndoe123

For more information, see tests/README.md
`);
}

function checkPrerequisites(): boolean {
  console.log('🔍 Checking prerequisites...');

  // Check if test files exist
  const testDir = join(__dirname, 'e2e');
  if (!existsSync(testDir)) {
    console.error('❌ Test directory not found:', testDir);
    return false;
  }

  // Check if setup file exists
  const setupFile = join(testDir, 'setup.ts');
  if (!existsSync(setupFile)) {
    console.error('❌ Setup file not found:', setupFile);
    return false;
  }

  console.log('✅ Prerequisites checked');
  return true;
}

function runTest(testName: string, options: RunnerOptions): void {
  const test = tests.find(t => t.name === testName);
  if (!test) {
    console.error(`❌ Test '${testName}' not found`);
    console.log('Available tests:', tests.map(t => t.name).join(', '));
    process.exit(1);
  }

  const testFile = join(__dirname, 'e2e', test.file);
  if (!existsSync(testFile)) {
    console.error(`❌ Test file not found: ${testFile}`);
    process.exit(1);
  }

  console.log(`🚀 Running ${test.name} tests...`);
  console.log(`📝 ${test.description}`);
  console.log(`📁 File: ${test.file}`);
  console.log('');

  try {
    const env = { ...process.env };
    
    if (options.headless) {
      env.HEADLESS = 'true';
    }
    
    if (options.verbose) {
      env.VERBOSE = 'true';
    }

    execSync(`npx ts-node "${testFile}"`, {
      stdio: 'inherit',
      env,
      cwd: join(__dirname, '..')
    });

    console.log(`✅ ${test.name} tests completed successfully`);
  } catch (error) {
    console.error(`❌ ${test.name} tests failed`);
    process.exit(1);
  }
}

function runAllTests(options: RunnerOptions): void {
  console.log('🚀 Running all AbacusHub E2E tests...');
  console.log(`📊 Total test suites: ${tests.length}`);
  console.log('');

  let passed = 0;
  let failed = 0;
  const results: { test: string; status: 'passed' | 'failed'; error?: string }[] = [];

  for (const test of tests) {
    try {
      console.log(`🧪 Running ${test.name} tests...`);
      runTest(test.name, options);
      passed++;
      results.push({ test: test.name, status: 'passed' });
      console.log('');
    } catch (error) {
      failed++;
      results.push({ 
        test: test.name, 
        status: 'failed', 
        error: error instanceof Error ? error.message : String(error)
      });
      console.log('');
    }
  }

  // Summary report
  console.log('📊 TEST SUMMARY');
  console.log('═'.repeat(50));
  console.log(`Total test suites: ${tests.length}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log(`Success rate: ${((passed / tests.length) * 100).toFixed(1)}%`);
  console.log('');

  // Detailed results
  console.log('📋 DETAILED RESULTS');
  console.log('═'.repeat(50));
  for (const result of results) {
    const status = result.status === 'passed' ? '✅' : '❌';
    console.log(`${status} ${result.test.padEnd(12)} - ${result.status}`);
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
  }

  if (failed > 0) {
    console.log('');
    console.log('❌ Some tests failed. Check the output above for details.');
    process.exit(1);
  } else {
    console.log('');
    console.log('🎉 All tests passed successfully!');
    console.log('');
    console.log('The comprehensive test suite has verified that every button,');
    console.log('form, and function of the AbacusHub application works correctly.');
  }
}

async function main(): Promise<void> {
  const options = parseArgs();

  if (options.help) {
    showHelp();
    return;
  }

  console.log('🧪 AbacusHub E2E Test Suite');
  console.log('═'.repeat(50));
  console.log('Comprehensive testing of every button, form, and function');
  console.log('');

  if (!checkPrerequisites()) {
    process.exit(1);
  }

  if (options.test) {
    runTest(options.test, options);
  } else {
    runAllTests(options);
  }
}

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught exception:', error.message);
  process.exit(1);
});

process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled rejection:', error);
  process.exit(1);
});

// Run the main function
main().catch((error) => {
  console.error('❌ Test runner failed:', error);
  process.exit(1);
});