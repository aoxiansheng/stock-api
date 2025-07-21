const tseslint = require('typescript-eslint');
const prettier = require('eslint-config-prettier');

module.exports = tseslint.config(
  {
    ignores: [
      ".eslintrc.js",
      "dist/",
      "node_modules/",
      "coverage/",
      "test-results/"
    ]
  },
  {
    files: ["src/**/*.ts", "test/**/*.ts"],
    extends: [
      ...tseslint.configs.recommended,
      prettier,
    ],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: __dirname,
      },
    },
    rules: {
      '@typescript-eslint/interface-name-prefix': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
); 