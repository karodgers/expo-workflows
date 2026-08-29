/**
 * This configuration ensures consistent code formatting across the entire codebase.
 * It is designed to work seamlessly with ESLint through eslint-plugin-prettier.
 */

module.exports = {
  // maximum line width before wrapping
  printWidth: 100,

  // wrap prose (markdown, comments) at printWidth
  proseWrap: 'always',

  // use spaces for indentation
  useTabs: false,

  // number of spaces per indentation level
  tabWidth: 2,

  // use single quotes for strings
  singleQuote: true,

  // use single quotes in JSX (consistent with JS)
  jsxSingleQuote: false,

  // add semicolons at the end of statements
  semi: true,

  // add trailing commas wherever possible (ES5+)
  trailingComma: 'all',

  // print spaces between brackets in object literals
  bracketSpacing: true,

  // put the > of a multi-line JSX element at the end of the last line
  bracketSameLine: false,

  // include parentheses around a sole arrow function parameter
  arrowParens: 'always',

  // httml/jsx whitespace
  htmlWhitespaceSensitivity: 'css',

  // end of line - use Unix-style line endings (LF)
  endOfLine: 'lf',

  // format embedded code
  embeddedLanguageFormatting: 'auto',

  // maintain special quotes in objects
  quoteProps: 'as-needed',

  // overrides for specific files
  overrides: [
    // JSON files
    {
      files: ['*.json', '.prettierrc'],
      options: {
        tabWidth: 2,
        printWidth: 80,
      },
    },
    // YAML files
    {
      files: ['*.yml', '*.yaml'],
      options: {
        tabWidth: 2,
        singleQuote: false,
      },
    },
    // Markdown files
    {
      files: ['*.md', '*.mdx'],
      options: {
        tabWidth: 2,
        proseWrap: 'always',
        printWidth: 80,
      },
    },
    // Package.json (keep it compact but readable)
    {
      files: 'package.json',
      options: {
        tabWidth: 2,
        printWidth: 80,
      },
    },
  ],
};
