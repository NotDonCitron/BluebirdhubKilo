const nextJest = require('next/jest');

const createJestConfig = nextJest({
  dir: './',
});

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '^@/components/(.*)$': '<rootDir>/components/$1',
    '^@/lib/(.*)$': '<rootDir>/lib/$1',
    '^@/hooks/(.*)$': '<rootDir>/hooks/$1',
    '^@/app/(.*)$': '<rootDir>/app/$1',
    '^@/prisma/(.*)$': '<rootDir>/prisma/$1',
  },
  testEnvironment: 'jest-environment-jsdom',
  reporters: [
    'default',
    ['<rootDir>/lib/jest-file-reporter.js', { outputPath: 'logs/upload-test.txt' }],
    ['jest-html-reporters', {
      publicPath: './coverage/upload-tests',
      filename: 'upload-test-report.html',
      openReport: false,
      pageTitle: 'AbacusHub File Upload Test Report',
      logoImgPath: undefined,
      hideIcon: false,
      includeFailureMsg: true,
      includeSuiteFailure: true,
    }],
  ],
  collectCoverageFrom: [
    'hooks/use-file-upload.ts',
    'app/api/upload/**/*.ts',
    'lib/storage.ts',
    'components/**/file-upload.tsx',
    'components/**/upload*.tsx',
    '!**/*.d.ts',
    '!**/node_modules/**',
  ],
  testMatch: [
    '**/__tests__/hooks/use-file-upload.test.ts',
    '**/__tests__/api/upload.test.ts',
    '**/__tests__/e2e/file-upload-comprehensive.test.ts',
    '**/__tests__/performance/upload-speed.test.ts',
    '**/__tests__/security/upload-security.test.ts',
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': ['babel-jest', { presets: ['next/babel'] }],
  },
  globals: {
    'ts-jest': {
      tsconfig: '<rootDir>/tsconfig.test.json',
    },
  },
  transformIgnorePatterns: [
    '/node_modules/',
    '^.+\\.module\\.(css|sass|scss)$',
  ],
  testTimeout: 120000, // 2 minutes for comprehensive tests
  maxWorkers: 1, // Run tests sequentially for file upload tests
  verbose: true,
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
    './hooks/use-file-upload.ts': {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
    './app/api/upload/route.ts': {
      branches: 75,
      functions: 75,
      lines: 75,
      statements: 75,
    },
  },
};

module.exports = createJestConfig(customJestConfig);