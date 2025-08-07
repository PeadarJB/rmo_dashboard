// eslint.config.js  (flat config)
import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';      // ⭐ NEW
import { globalIgnores } from 'eslint/config';

export default tseslint.config([
  globalIgnores(['dist']),                         // ignore build output
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,                      // ≈ 'eslint:recommended'
      tseslint.configs.recommended,                // @typescript-eslint/recommended
      reactHooks.configs['recommended-latest'],    // plugin:react-hooks/recommended
      reactRefresh.configs.vite,                   // react-refresh base
      prettier,                                    // ⭐ disable rules Prettier will auto-fix
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      // 🔁 rules migrated from the old .eslintrc.json
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_' },
      ],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
]);
