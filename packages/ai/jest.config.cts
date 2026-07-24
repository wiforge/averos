/* eslint-disable */
const { readFileSync } = require("fs")

// Reading the SWC compilation config for the spec files
const swcJestConfig = JSON.parse(readFileSync(`${__dirname}/.spec.swcrc`, "utf-8"))

// Disable .swcrc look-up by SWC core because we're passing in swcJestConfig ourselves
swcJestConfig.swcrc = false

module.exports = {
  displayName: "@averos/ai",
  preset: "../../jest.preset.js",
  testEnvironment: "node",
  transform: {
    "^.+\\.[tj]s$": ["@swc/jest", swcJestConfig],
  },
  moduleFileExtensions: ["ts", "js", "html"],
  
  rootDir: '.',
    testMatch: ['<rootDir>/tests/**/*.test.ts'],
    moduleNameMapper: {
      '^@averos/ai$':       '<rootDir>/src/index.ts',
      '^@averos/ai/(.*)$':  '<rootDir>/src/$1',
    },
    collectCoverageFrom: ['src/**/*.ts'],
    coverageDirectory: 'test-output/jest/coverage',
}
