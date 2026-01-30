module.exports = {
  preset: "detox/runner/jest/preset",
  testRunner: "jest-circus/runner",
  setupFilesAfterEnv: ["<rootDir>/init.js"],
  testTimeout: 120000,
};
