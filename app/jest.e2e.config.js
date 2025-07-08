/** @type {import('jest').Config} */
module.exports = {
  displayName: 'E2E Tests',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests/e2e'],
  testMatch: [
    '<rootDir>/tests/e2e/**/*.test.ts',
    '<rootDir>/tests/e2e/**/*.test.js'
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^@/components/(.*)$': '<rootDir>/components/$1',
    '^@/lib/(.*)$': '<rootDir>/lib/$1',
    '^@/hooks/(.*)$': '<rootDir>/hooks/$1',
    '^@/app/(.*)$': '<rootDir>/app/$1',
    '^@/prisma/(.*)$': '<rootDir>/prisma/$1',
  },
  setupFilesAfterEnv: ['<rootDir>/tests/e2e/setup.ts'],
  testTimeout: 120000, // 2 minutes timeout for E2E tests
  verbose: true,
  collectCoverageFrom: [
    'app/**/*.{ts,tsx}',
    'components/**/*.{ts,tsx}',
    'lib/**/*.{ts,tsx}',
    'hooks/**/*.{ts,tsx}',
    '!**/*.d.ts',
    '!**/*.test.{ts,tsx}',
    '!**/node_modules/**'
  ],
  coverageDirectory: 'coverage/e2e',
  coverageReporters: ['text', 'lcov', 'html'],
  maxConcurrency: 1,
  maxWorkers: 1,
  forceExit: true,
  detectOpenHandles: true,
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
        esModuleInterop: true,
        moduleResolution: 'node'
      }
    }]
  }
};