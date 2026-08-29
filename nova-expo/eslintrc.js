/**
 * This configuration enforces:
 * - TypeScript best practices and type safety
 * - React and React Native conventions
 * - Import organization and module resolution
 * - Accessibility standards for React Native
 * - Code quality and consistency rules
 */

module.exports = {
  root: true,

  // Environment settings
  env: {
    browser: true,
    es2024: true,
    node: true,
    'react-native/react-native': true,
  },

  // Parser configuration for TypeScript
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    },
    project: './tsconfig.eslint.json',
    tsconfigRootDir: __dirname,
  },

  // Plugin ecosystem
  plugins: [
    '@typescript-eslint',
    'react',
    'react-hooks',
    'react-native',
    'import',
    'jsx-a11y',
    'prettier',
  ],

  // Extended configurations (order matters - later configs override earlier ones)
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking',
    'plugin:react/recommended',
    'plugin:react/jsx-runtime',
    'plugin:react-hooks/recommended',
    'plugin:react-native/all',
    'plugin:import/recommended',
    'plugin:import/typescript',
    'plugin:jsx-a11y/recommended',
    'plugin:prettier/recommended', // Must be last to override other formatting rules
  ],

  // Shared settings
  settings: {
    react: {
      version: 'detect',
    },
    'import/resolver': {
      typescript: {
        alwaysTryTypes: true,
        project: './tsconfig.eslint.json',
      },
      node: {
        extensions: ['.js', '.jsx', '.ts', '.tsx', '.json'],
      },
    },
    'import/parsers': {
      '@typescript-eslint/parser': ['.ts', '.tsx'],
    },
  },

  // custom rule configuration
  rules: {
    // pretier configuration
    'prettier/prettier': [
      'error',
      {},
      {
        usePrettierrc: true,
      },
    ],

    // typescript rules
    // enforce explicit return types for better documentation and type safety
    '@typescript-eslint/explicit-function-return-type': [
      'warn',
      {
        allowExpressions: true,
        allowTypedFunctionExpressions: true,
        allowHigherOrderFunctions: true,
        allowDirectConstAssertionInArrowFunctions: true,
      },
    ],

    // enforce explicit accessibility modifiers on class members
    '@typescript-eslint/explicit-member-accessibility': [
      'error',
      {
        accessibility: 'explicit',
        overrides: {
          constructors: 'no-public',
        },
      },
    ],

    // prefer interfaces over type aliases for object types
    '@typescript-eslint/consistent-type-definitions': ['error', 'interface'],

    // enforce consistent type imports
    '@typescript-eslint/consistent-type-imports': [
      'error',
      {
        prefer: 'type-imports',
        disallowTypeAnnotations: true,
        fixStyle: 'separate-type-imports',
      },
    ],

    // prevent unused variables (but allow underscore prefix for intentionally unused)
    '@typescript-eslint/no-unused-vars': [
      'error',
      {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      },
    ],

    // disallow any type - enforce proper typing
    '@typescript-eslint/no-explicit-any': 'error',

    // ensure promises are handled properly
    '@typescript-eslint/no-floating-promises': 'error',
    '@typescript-eslint/no-misused-promises': [
      'error',
      {
        checksVoidReturn: {
          attributes: false,
        },
      },
    ],

    // enforce nullish coalescing operator over logical OR for nullable values
    '@typescript-eslint/prefer-nullish-coalescing': 'error',

    // enforce optional chaining
    '@typescript-eslint/prefer-optional-chain': 'error',

    // require type annotations in certain places for clarity
    '@typescript-eslint/typedef': [
      'warn',
      {
        arrayDestructuring: false,
        arrowParameter: false,
        memberVariableDeclaration: true,
        objectDestructuring: false,
        parameter: false,
        propertyDeclaration: true,
        variableDeclaration: false,
      },
    ],

    // naming conventions
    '@typescript-eslint/naming-convention': [
      'error',
      // Interfaces should be PascalCase and NOT prefixed with 'I'
      {
        selector: 'interface',
        format: ['PascalCase'],
        custom: {
          regex: '^I[A-Z]',
          match: false,
        },
      },
      // yypes should be PascalCase
      {
        selector: 'typeLike',
        format: ['PascalCase'],
      },
      // variables should be camelCase or UPPER_CASE (for constants)
      {
        selector: 'variable',
        format: ['camelCase', 'UPPER_CASE', 'PascalCase'],
        leadingUnderscore: 'allow',
      },
      // functions should be camelCase or PascalCase (for components)
      {
        selector: 'function',
        format: ['camelCase', 'PascalCase'],
      },
      // parameters should be camelCase
      {
        selector: 'parameter',
        format: ['camelCase'],
        leadingUnderscore: 'allow',
      },
      // enum members should be PascalCase or UPPER_CASE
      {
        selector: 'enumMember',
        format: ['PascalCase', 'UPPER_CASE'],
      },
    ],

    // react rules
    // ensure proper use of keys in lists
    'react/jsx-key': [
      'error',
      {
        checkFragmentShorthand: true,
        checkKeyMustBeforeSpread: true,
        warnOnDuplicates: true,
      },
    ],

    // prevent missing props validation (TypeScript handles this)
    'react/prop-types': 'off',

    // enforce boolean prop naming convention
    'react/jsx-boolean-value': ['error', 'never'],

    // enforce self-closing tags for components without children
    'react/self-closing-comp': [
      'error',
      {
        component: true,
        html: true,
      },
    ],

    // enforce consistent JSX curly brace usage
    'react/jsx-curly-brace-presence': [
      'error',
      {
        props: 'never',
        children: 'never',
      },
    ],

    // prevent unnecessary fragments
    'react/jsx-no-useless-fragment': ['error', { allowExpressions: true }],

    // enforce component definition style
    'react/function-component-definition': [
      'error',
      {
        namedComponents: 'arrow-function',
        unnamedComponents: 'arrow-function',
      },
    ],

    // enforce destructuring of props and state
    'react/destructuring-assignment': ['error', 'always'],

    // react hooks rules
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',

    // react native rules
    // detect unused styles
    'react-native/no-unused-styles': 'error',

    // detect-native/no-inline-styles': 'error',

    // detect raw text outside of Text component
    'react-native/no-raw-text': [
      'error',
      {
        skip: ['AppText', 'Button'],
      },
    ],

    // prevent color literals in styles
    'react-native/no-color-literals': 'warn',

    // sort styles
    'react-native/sort-styles': [
      'error',
      'asc',
      {
        ignoreClassNames: false,
        ignoreStyleProperties: false,
      },
    ],

    // import rules
    // enforce import order and grouping
    'import/order': [
      'error',
      {
        groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index', 'object', 'type'],
        pathGroups: [
          {
            pattern: 'react',
            group: 'builtin',
            position: 'before',
          },
          {
            pattern: 'react-native',
            group: 'builtin',
            position: 'before',
          },
          {
            pattern: 'expo-*',
            group: 'external',
            position: 'before',
          },
          {
            pattern: '@/**',
            group: 'internal',
            position: 'before',
          },
        ],
        pathGroupsExcludedImportTypes: ['react', 'react-native'],
        'newlines-between': 'always',
        alphabetize: {
          order: 'asc',
          caseInsensitive: true,
        },
      },
    ],

    // prevent duplicate imports
    'import/no-duplicates': 'error',

    // ensure imports resolve
    'import/no-unresolved': 'error',

    // prevent default export - named exports are more maintainable
    'import/prefer-default-export': 'off',
    'import/no-default-export': 'off', // Allow default exports for screens/pages

    // prevent circular dependencies
    'import/no-cycle': ['error', { maxDepth: 10 }],

    // prevent importing from self
    'import/no-self-import': 'error',

    // prevent useless path segments
    'import/no-useless-path-segments': [
      'error',
      {
        noUselessIndex: true,
      },
    ],

    // general best practices
    // enforce consistent use of curly braces
    curly: ['error', 'all'],

    // require strict equality
    eqeqeq: ['error', 'always', { null: 'ignore' }],

    // prevent console.log (use proper logging)
    'no-console': [
      'warn',
      {
        allow: ['warn', 'error', 'info'],
      },
    ],

    // prevent debugger statements
    'no-debugger': 'error',

    // prevent alert dialogs
    'no-alert': 'error',

    // prefer const over let
    'prefer-const': 'error',

    // disallow var
    'no-var': 'error',

    // enforce object shorthand
    'object-shorthand': ['error', 'always'],

    // prefer template literals
    'prefer-template': 'error',

    // prefer arrow callbacks
    'prefer-arrow-callback': 'error',

    // require default case in switch
    'default-case': 'error',

    // prevent nested ternaries
    'no-nested-ternary': 'error',

    // maximum line length (Prettier handles this, but as a safety net)
    'max-len': [
      'warn',
      {
        code: 100,
        tabWidth: 2,
        ignoreUrls: true,
        ignoreStrings: true,
        ignoreTemplateLiterals: true,
        ignoreRegExpLiterals: true,
        ignoreComments: true,
      },
    ],

    // maximum file length
    'max-lines': [
      'warn',
      {
        max: 400,
        skipBlankLines: true,
        skipComments: true,
      },
    ],

    // Maximum function length
    'max-lines-per-function': [
      'warn',
      {
        max: 200,
        skipBlankLines: true,
        skipComments: true,
        IIFEs: true,
      },
    ],

    // cyclomatic complexity
    complexity: ['warn', { max: 15 }],

    // maximum depth of nested blocks
    'max-depth': ['warn', 4],

    // maximum parameters per function
    'max-params': ['warn', 5],
  },

  // file-specific overrides
  overrides: [
    // test files
    {
      files: ['**/*.test.ts', '**/*.test.tsx', '**/*.spec.ts', '**/*.spec.tsx'],
      env: {
        jest: true,
      },
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/no-unsafe-assignment': 'off',
        '@typescript-eslint/no-unsafe-call': 'off',
        '@typescript-eslint/no-unsafe-member-access': 'off',
        'max-lines-per-function': 'off',
        'max-lines': 'off',
      },
    },
    // configuration files
    {
      files: ['*.config.js', '*.config.ts', '.eslintrc.js'],
      rules: {
        '@typescript-eslint/no-var-requires': 'off',
        'import/no-default-export': 'off',
      },
    },
    // type declaration files
    {
      files: ['*.d.ts'],
      rules: {
        '@typescript-eslint/no-unused-vars': 'off',
        'import/no-default-export': 'off',
      },
    },
    // entry points and pages (allow default exports)
    {
      files: ['App.tsx', 'index.ts', 'index.tsx', '**/screens/**/*.tsx', '**/pages/**/*.tsx'],
      rules: {
        'import/no-default-export': 'off',
      },
    },
  ],

  // ignore patterns
  ignorePatterns: [
    'node_modules/',
    '.expo/',
    'dist/',
    'build/',
    'coverage/',
    '*.min.js',
    '*.bundle.js',
    '.git/',
  ],
};
