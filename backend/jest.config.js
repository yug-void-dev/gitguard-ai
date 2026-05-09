/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts'],
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: {
          noUnusedLocals: false,
          noUnusedParameters: false,
        },
      },
    ],
  },
  // arctic and other ESM packages must be transformed
  transformIgnorePatterns: [
    '/node_modules/(?!(arctic)/)',
  ],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/server.ts',
    '!src/**/*.d.ts',
  ],
<<<<<<< HEAD
  testTimeout: 10000,
  moduleNameMapper: {
    '^arctic$': '<rootDir>/tests/__mocks__/arctic.ts'
  },
=======
  testTimeout: 15000,
>>>>>>> 34c35bf (fix(core): fix jest config and add missing supertest dependency)
};
