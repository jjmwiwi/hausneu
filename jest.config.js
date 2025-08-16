module.exports = {
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/tests'],
  moduleNameMapper: {
    '^electron$': '<rootDir>/tests/__mocks__/electron.js',
    '^@/(.*)$': '<rootDir>/renderer/$1'
  },
  testMatch: ['<rootDir>/tests/**/*.test.{js,jsx,ts,tsx}'],
  testPathIgnorePatterns: ['<rootDir>/archive/'],
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: 'tsconfig.json',
      useESM: false
    }],
    '^.+\\.(js|jsx)$': ['babel-jest', {
      presets: ['@babel/preset-env', '@babel/preset-react']
    }]
  },
  transformIgnorePatterns: [
    'node_modules/(?!(vite|@vitejs)/)'
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  collectCoverageFrom: [
    'renderer/**/*.{ts,tsx}',
    '!renderer/**/*.d.ts'
  ],
  setupFilesAfterEnv: ['<rootDir>/tests/setupDom.js'],
  preset: 'ts-jest',
  globals: {
    'ts-jest': {
      tsconfig: 'tsconfig.json',
      useESM: false
    }
  },
  // Mock für import.meta.env
  setupFiles: ['<rootDir>/tests/setupImportMeta.js']
};
