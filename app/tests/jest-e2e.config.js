/** @type {import('jest').Config} */
module.exports = {
  displayName: 'E2E Tests',
  rootDir: '../',
  testMatch: ['<rootDir>/tests/e2e/**/*.test.ts'],
  testEnvironment: 'node',
  preset: 'ts-jest',
  setupFilesAfterEnv: ['<rootDir>/tests/e2e/setup.ts'],
  testTimeout: 60000,
  maxWorkers: 1, // Run tests sequentially to avoid browser conflicts
  collectCoverageFrom: [
    'app/**/*.{ts,tsx}',
    '!app/**/*.d.ts',
    '!app/**/*.test.{ts,tsx}',
    '!app/**/node_modules/**'
  ],
  coverageDirectory: '<rootDir>/tests/coverage/e2e',
  coverageReporters: ['text', 'lcov', 'html'],
  verbose: true,
  reporters: [
    'default',
    ['jest-html-reporters', {
      publicPath: './tests/reports',
      filename: 'e2e-test-report.html',
      pageTitle: 'AbacusHub E2E Test Report',
      logoImgPath: './logo.png',
      expand: true
    }]
  ]
};