const { resolve } = require("node:path");

const project = resolve(process.cwd(), "tsconfig.json");

module.exports = {
  extends: [
    "plugin:@typescript-eslint/eslint-recommended",
    "plugin:@typescript-eslint/recommended",
    'plugin:react/recommended',
    'plugin:import/react'
  ],
  globals: {
    React: true,
    JSX: true,
  },
  parserOptions: {
    ecmaVersion: 12,
    sourceType: "module",
    project
  },
  settings: {
    "import/resolver": {
      typescript: {
        project,
      },
    },
    react: {
      version: 'detect',
    },
  },
}