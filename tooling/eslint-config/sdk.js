module.exports = {
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/eslint-recommended",
    "plugin:@typescript-eslint/recommended",
  ],
  env: {
    browser: true,
    commonjs: false,
    node: false
  },
  ignorePatterns: [
    // Ignore dotfiles
    ".*.js",
    "node_modules/",
    "dist/",
  ],
  overrides: [
    {
      files: ["*.ts"],
      plugins: [
        "@typescript-eslint"
      ],
      parser: "@typescript-eslint/parser",
      rules: {
        // https://typescript-eslint.io/docs/linting/troubleshooting/#i-am-using-a-rule-from-eslint-core-and-it-doesnt-work-correctly-with-typescript-code
        "no-undef": "off",
        "no-unused-vars": "off",
        "@typescript-eslint/no-unused-vars": [2, {
          "destructuredArrayIgnorePattern": "^_",
          "ignoreRestSiblings": true
        }]
      }
    },
    {
      files: ["test/types/*.ts"],
      env: {
        browser: true,
        node: true
      },
      rules: {
        "no-unused-vars": 0,
        "@typescript-eslint/no-unused-vars": 0,
        "max-statements": 0
      }
    },
    {
      files: [
        'test/spec/**/*'
      ],
      rules: {
        "max-len": 0,
        "max-statements": 0,
        "camelcase": 0,
        "@typescript-eslint/ban-ts-comment": 0,
        "@typescript-eslint/no-non-null-assertion": 0
      }
    }
  ],
  rules: {
    "no-var": 0,
    "prefer-rest-params": 0,
    "prefer-spread": 0,
    "prefer-const": 0,
    camelcase: 2,
    complexity: [2, 15],
    curly: 2,
    "dot-notation": 0,
    "guard-for-in": 2,
    "new-cap": [2, { properties: false }],
    "no-caller": 2,
    "no-empty": 2,
    "no-eval": 2,
    "no-implied-eval": 2,
    "no-multi-str": 0,
    "no-new": 2,
    "no-plusplus": 0,
    "no-undef": 2,
    "no-use-before-define": 0,    // disabling in favor of @typescript-eslint/no-use-before-define
    "no-unused-expressions": [2, { allowShortCircuit: true, allowTernary: true }],
    "no-unused-vars": 2,
    "no-case-declarations": 0,
    "new-cap": 0,
    "max-depth": [2, 3],
    "max-len": [2, 140],
    "max-params": [2, 5],
    "max-statements": [2, 25],
    quotes: [2, "single", { allowTemplateLiterals: true }],
    semi: 2,
    strict: 0,
    "wrap-iife": [2, "any"],
    "no-throw-literal": 2,
    "@typescript-eslint/no-var-requires": 0,
    "@typescript-eslint/explicit-function-return-type": 0,
    "@typescript-eslint/camelcase": 0,
    "@typescript-eslint/no-this-alias": 0,
    "@typescript-eslint/no-empty-function": 0,
    "@typescript-eslint/no-use-before-define": [2, {
      functions: true,
      classes: true,
      variables: true,
      allowNamedExports: false
    }],
    "@typescript-eslint/ban-ts-ignore": 0,
    "@typescript-eslint/no-explicit-any": 0,
    "@typescript-eslint/interface-name-prefix": 0,
    "@typescript-eslint/triple-slash-reference": 0,
    "@typescript-eslint/no-unused-vars": [0, {
      "ignoreRestSiblings": true
    }],
    "@typescript-eslint/no-namespace": 0
  }
}
