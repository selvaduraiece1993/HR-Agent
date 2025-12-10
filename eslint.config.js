// eslint.config.js
import js from '@eslint/js';
import next from 'eslint-config-next';
import prettier from 'eslint-config-prettier';
import pluginPrettier from 'eslint-plugin-prettier';

const eslintConfig = [
  {
    ignores: ['.next/**', 'node_modules/**'],
  },
  // Project global names used across many components (defined in `services/Constants.jsx`)
  {
    languageOptions: {
      globals: {
        DB_TABLES: 'readonly',
      },
    },
  },
  js.configs.recommended,
  ...next,
  {
    plugins: { prettier: pluginPrettier },
    rules: {
      'prettier/prettier': [
        'error',
        { singleQuote: true },
        { endOfLine: 'auto' },
      ],
    },
  },
  prettier, // Disable ESLint rules that conflict with Prettier
];

export default eslintConfig;
