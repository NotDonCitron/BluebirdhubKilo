const { spawn } = require('child_process');

// Set the BASE_URL environment variable
process.env.BASE_URL = 'http://localhost:3000';

console.log('Running integration tests with BASE_URL:', process.env.BASE_URL);

// Run the npm test command
const testProcess = spawn('npm', ['run', 'test:e2e:integration'], {
  env: process.env,
  stdio: 'inherit',
  shell: true
});

testProcess.on('close', (code) => {
  console.log(`Integration tests completed with exit code ${code}`);
  process.exit(code);
});

testProcess.on('error', (error) => {
  console.error('Failed to start test process:', error);
  process.exit(1);
}); 