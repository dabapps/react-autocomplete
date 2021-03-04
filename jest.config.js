const IGNORED_FROM_TESTS = [
  '<rootDir>/lib/__tests__/__helpers__/',
  '<rootDir>/build/',
  '<rootDir>/dist/',
];

module.exports = {
  preset: 'ts-jest',
  snapshotSerializers: ['enzyme-to-json/serializer'],
  modulePathIgnorePatterns: IGNORED_FROM_TESTS,
  testPathIgnorePatterns: IGNORED_FROM_TESTS,
  setupFiles: ['<rootDir>/lib/__tests__/__helpers__/setup.ts'],
  collectCoverageFrom: ['<rootDir>/lib/**/*.{js,jsx,ts,tsx}'],
  coveragePathIgnorePatterns: [
    ...IGNORED_FROM_TESTS,
    '<rootDir>/lib/__tests__/',
  ],
};
