#!/usr/bin/env node

const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

const logger = {
  info: (msg) => console.log(`[INFO] ${new Date().toISOString()} - ${msg}`),
  success: (msg) => console.log(`[SUCCESS] ${new Date().toISOString()} - ${msg}`),
  error: (msg) => console.error(`[ERROR] ${new Date().toISOString()} - ${msg}`),
  warn: (msg) => console.warn(`[WARN] ${new Date().toISOString()} - ${msg}`),
};

async function ensureDirectories() {
  const dirs = [
    './logs',
    './coverage/upload-tests',
    './test-files',
  ];

  for (const dir of dirs) {
    try {
      await fs.mkdir(dir, { recursive: true });
      logger.info(`Created directory: ${dir}`);
    } catch (error) {
      if (error.code !== 'EEXIST') {
        logger.warn(`Failed to create directory ${dir}: ${error.message}`);
      }
    }
  }
}

async function runTestSuite(name, config, pattern) {
  return new Promise((resolve, reject) => {
    logger.info(`Starting ${name} tests...`);
    
    const args = [
      'run',
      'test',
      '--config',
      config,
      '--testPathPattern',
      pattern,
      '--coverage',
      '--verbose',
      '--detectOpenHandles',
      '--forceExit',
    ];

    const jest = spawn('npm', args, {
      stdio: 'inherit',
      shell: true,
    });

    jest.on('close', (code) => {
      if (code === 0) {
        logger.success(`${name} tests completed successfully`);
        resolve({ name, success: true, code });
      } else {
        logger.error(`${name} tests failed with code ${code}`);
        resolve({ name, success: false, code });
      }
    });

    jest.on('error', (error) => {
      logger.error(`Failed to start ${name} tests: ${error.message}`);
      reject(error);
    });
  });
}

async function generateSummaryReport(results) {
  const report = {
    timestamp: new Date().toISOString(),
    totalSuites: results.length,
    successfulSuites: results.filter(r => r.success).length,
    failedSuites: results.filter(r => !r.success).length,
    results: results,
    summary: '',
  };

  report.summary = `
File Upload Test Execution Summary
=================================

Timestamp: ${report.timestamp}
Total Test Suites: ${report.totalSuites}
Successful: ${report.successfulSuites}
Failed: ${report.failedSuites}
Success Rate: ${((report.successfulSuites / report.totalSuites) * 100).toFixed(1)}%

Test Suite Results:
${results.map(r => `- ${r.name}: ${r.success ? 'PASS' : 'FAIL'} (exit code: ${r.code})`).join('\n')}

Coverage Reports:
- HTML Report: ./coverage/upload-tests/upload-test-report.html
- Logs: ./logs/upload-test.txt

Recommendations:
${report.failedSuites > 0 ? 
  '⚠️  Some test suites failed. Review the logs and fix issues before deployment.' :
  '✅ All test suites passed. File upload system is ready for deployment.'
}
`;

  const reportPath = './logs/upload-test-summary.md';
  await fs.writeFile(reportPath, report.summary);
  logger.success(`Summary report generated: ${reportPath}`);

  return report;
}

async function main() {
  logger.info('Starting comprehensive file upload test execution...');

  try {
    // Ensure required directories exist
    await ensureDirectories();

    // Test suites to run
    const testSuites = [
      {
        name: 'Unit Tests (Hook)',
        config: './jest.upload-tests.config.js',
        pattern: '__tests__/hooks/use-file-upload.test.ts',
      },
      {
        name: 'Integration Tests (API)',
        config: './jest.upload-tests.config.js',
        pattern: '__tests__/api/upload.test.ts',
      },
      {
        name: 'Security Tests',
        config: './jest.upload-tests.config.js',
        pattern: '__tests__/security/upload-security.test.ts',
      },
      {
        name: 'Performance Tests',
        config: './jest.upload-tests.config.js',
        pattern: '__tests__/performance/upload-speed.test.ts',
      },
      {
        name: 'E2E Tests',
        config: './jest.upload-tests.config.js',
        pattern: '__tests__/e2e/file-upload-comprehensive.test.ts',
      },
    ];

    const results = [];

    // Run test suites sequentially to avoid conflicts
    for (const suite of testSuites) {
      try {
        const result = await runTestSuite(suite.name, suite.config, suite.pattern);
        results.push(result);
      } catch (error) {
        logger.error(`Failed to run ${suite.name}: ${error.message}`);
        results.push({
          name: suite.name,
          success: false,
          code: -1,
          error: error.message,
        });
      }
    }

    // Generate summary report
    const report = await generateSummaryReport(results);

    // Display summary
    console.log('\n' + '='.repeat(60));
    console.log(report.summary);
    console.log('='.repeat(60) + '\n');

    // Exit with appropriate code
    const overallSuccess = report.failedSuites === 0;
    process.exit(overallSuccess ? 0 : 1);

  } catch (error) {
    logger.error(`Test execution failed: ${error.message}`);
    process.exit(1);
  }
}

// Handle process signals
process.on('SIGINT', () => {
  logger.warn('Test execution interrupted by user');
  process.exit(130);
});

process.on('SIGTERM', () => {
  logger.warn('Test execution terminated');
  process.exit(143);
});

// Run the main function
if (require.main === module) {
  main().catch((error) => {
    logger.error(`Unhandled error: ${error.message}`);
    process.exit(1);
  });
}

module.exports = { main, runTestSuite, generateSummaryReport };