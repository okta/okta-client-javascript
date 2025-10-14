const path = require('path');

module.exports = {
  roots: ['<rootDir>'],
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        // ts-jest options
        'tsconfig': '<rootDir>/test/tsconfig.json',
        useESM: true,
        transpilation: true
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
