module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testEnvironment: 'node',
  testRegex: '.*\\.e2e-spec\\.ts$',
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  moduleNameMapper: {
    // ─── Alias del proyecto ─────────────────────────────────────
    '^@common/(.*)$': '<rootDir>/src/common/$1',
    '^@infra/(.*)$': '<rootDir>/src/infra/$1',
    '^@catalog/(.*)$': '<rootDir>/src/modules/01catalog/$1',
    '^@cart/(.*)$': '<rootDir>/src/modules/02cart/$1',
    '^@order/(.*)$': '<rootDir>/src/modules/03order/$1',
    '^@payment/(.*)$': '<rootDir>/src/modules/04payments/$1',
    '^@identity/(.*)$': '<rootDir>/src/modules/identity/$1',
  },
  testTimeout: 60_000,
};