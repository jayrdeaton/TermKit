const { defineConfig } = require('eslint/config')
const base = require('@infinitetoken/eslint-config/npm-package')

module.exports = defineConfig([
  ...base,
  {
    ignores: ['**/*.cjs', 'src/__tests__/**', 'tsup.config.ts']
  },
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }]
    }
  }
])
