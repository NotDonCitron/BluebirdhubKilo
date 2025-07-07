/**
 * AbacusHub Integration Test Runner with Environment Validation
 * 
 * This script first validates the test environment using validate-test-environment.js
 * and then runs the integration tests if the environment is valid.
 */

import { validateTestEnvironment } from './validate-test-environment.js';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Runs a command in a child process
 * @param {string} command The command to run
 * @param {string[]} args The arguments to pass to the command
 * @returns {Promise<number>} The exit code of the process
 */
function runCommand(command, args) {
  return new Promise((resolve, reject) => {
    console.log(`Running: ${command} ${args.join(' ')}`);
    
    const process = spawn(command, args, {
      stdio: 'inherit',
      shell: true
    });
    
    process.on('close', (code) => {
      resolve(code);
    });
    
    process.on('error', (err) => {
      reject(err);
    });
  });
}

/**
 * Runs the integration tests with environment validation
 */
async function runIntegrationTestsWithValidation() {
  console.log('\n🚀 AbacusHub Integration Test Runner with Environment Validation');
  console.log('=============================================================\n');
  
  try {
    // Step 1: Validate the test environment
    console.log('Step 1: Validating test environment...');
    const environmentValid = await validateTestEnvironment();
    
    if (!environmentValid) {
      console.error('\n❌ Test environment validation failed. Aborting integration tests.');
      console.log('   Please fix the issues reported above before running integration tests.');
      process.exit(1);
    }
    
    console.log('\n✅ Test environment validation succeeded. Proceeding with integration tests.\n');
    
    // Step 2: Run the integration tests
    console.log('Step 2: Running integration tests...');
    const testExitCode = await runCommand('npm', ['run', 'test:integration']);
    
    if (testExitCode !== 0) {
      console.error(`\n❌ Integration tests failed with exit code ${testExitCode}.`);
      console.log('   Check the test output above for details on the failures.');
      process.exit(testExitCode);
    }
    
    console.log('\n✅ Integration tests completed successfully!');
    
    // Step 3: Generate test report if all tests pass
    console.log('\nStep 3: Generating test report...');
    await runCommand('node', [path.join(__dirname, 'generate-test-report.js')]);
    
    console.log('\n🎉 All steps completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error running integration tests:', error.message);
    process.exit(1);
  }
}

// Run the function if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runIntegrationTestsWithValidation().catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
}

export { runIntegrationTestsWithValidation };