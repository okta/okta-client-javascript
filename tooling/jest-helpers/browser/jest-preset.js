const path = require('path');

module.exports = {
  roots: ['<rootDir>'],
  testEnvironment: path.join(__dirname, 'jest.environment.js'),
  extensionsToTreatAsEsm: ['.ts'],
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        // ts-jest options
        'tsconfig': '<rootDir>/test/tsconfig.json',
        useESM: true,
      }
    ]
  },
  globals: {
    __PKG_NAME__: 'PLACEHOLDER',
    __PKG_VERSION__: 'PLACEHOLDER'
  },
  restoreMocks: true,
  clearMocks: true,
  testMatch: [
    '**/test/spec/**/*.{js,ts}'
  ],
  setupFiles: [
    // '<rootDir>/test/jest.setup.ts'
    path.join(__dirname, 'jest.setup.ts')
  ],
  setupFilesAfterEnv: [
    path.join(__dirname, 'jest.setupAfterEnv.ts')
  ],
  collectCoverageFrom: [
    'src/**/*.ts'
  ],
  moduleNameMapper: {
    '^src/(.*)$': '<rootDir>/src/$1'
  }
};
