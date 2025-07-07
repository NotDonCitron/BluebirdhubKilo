/** @type {import('jest').Config} */
module.exports = {
  displayName: 'E2E Tests',
  testEnvironment: 'node', // Use Node.js environment for Puppeteer
  roots: ['<rootDir>/tests/e2e'],
  testMatch: [
    '<rootDir>/tests/e2e/**/*.test.ts',
    '<rootDir>/tests/e2e/**/*.test.js'
  ],
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^@/components/(.*)$': '<rootDir>/components/$1',
    '^@/lib/(.*)$': '<rootDir>/lib/$1',
    '^@/hooks/(.*)$': '<rootDir>/hooks/$1',
    '^@/app/(.*)$': '<rootDir>/app/$1',
    '^@/prisma/(.*)$': '<rootDir>/prisma/$1',
  },
  setupFilesAfterEnv: [],
  testTimeout: 180000, // 3 minutes timeout for E2E tests
  verbose: true,
  collectCoverageFrom: [
    'tests/e2e/**/*.{ts,tsx}',
    'tests/utils/**/*.{ts,tsx}',
    '!tests/**/*.d.ts',
  ],
  coverageDirectory: 'coverage/e2e',
  coverageReporters: ['text', 'lcov', 'html'],
  maxConcurrency: 1, // Run E2E tests sequentially
  maxWorkers: 1, // Use only one worker for E2E tests
  forceExit: true, // Force Jest to exit after tests complete
  detectOpenHandles: true, // Help detect async operations that prevent Jest from exiting
  reporters: [
    'default',
    [
      'jest-html-reporters',
      {
        publicPath: './coverage/e2e/html-report',
        filename: 'e2e-report.html',
        expand: true,
        hideIcon: false,
        pageTitle: 'AbacusHub E2E Test Report'
      }
    ]
  ],
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      useESM: false,
      tsconfig: {
        module: 'CommonJS',
        target: 'ES2020',
        skipLibCheck: true,
        allowSyntheticDefaultImports: true,
        esModuleInterop: true
      }
    }]
  }
};