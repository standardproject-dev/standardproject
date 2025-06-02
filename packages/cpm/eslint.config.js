// @ts-check

import eslint from '@eslint/js'
import tseslint from 'typescript-eslint'
import stylistic from '@stylistic/eslint-plugin'

export default tseslint.config(
  stylistic.configs.customize({
    indent: 2,
    quotes: 'single',
    semi: false,
    commaDangle: 'always-multiline',
    jsx: true,
    braceStyle: '1tbs',
  }),
  eslint.configs.recommended,
  tseslint.configs.strictTypeChecked,
  tseslint.configs.stylisticTypeChecked,

  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    rules: {
      '@typescript-eslint/consistent-type-definitions': 'off',
      'react-hooks/rules-of-hooks': 'off',
      'react/react-in-jsx-scope': 'off',
      'react/display-name': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-unsafe-declaration-merging': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unnecessary-type-constraint': 'off',
      '@typescript-eslint/no-empty-object-type': 'off',
      '@typescript-eslint/prefer-nullish-coalescing': 'off',
      '@typescript-eslint/no-extraneous-class': 'off',

      'react/prop-types': 'off',
      'eol-last': ['error', 'always'],
      'eqeqeq': ['error'],

      '@typescript-eslint/no-this-alias': ['error', {
        allowDestructuring: true,
        allowedNames: ['self', 'node'],
      }],

      '@typescript-eslint/no-empty-function': ['error', {
        allow: [
          'private-constructors',
          'protected-constructors',
          'methods',
          'asyncMethods',
          'arrowFunctions',
        ],
      }],

      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
      }],

      '@typescript-eslint/restrict-template-expressions': 'off',

      '@stylistic/ts/arrow-parens': [2, 'as-needed', { requireForBlockBody: true }],
      '@stylistic/ts/semi': ['error', 'never'],
    },
  },
)
