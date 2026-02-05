import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import { Config, defineConfig } from "eslint/config";

const config: Config[] = defineConfig([
  {
    // Ignore patterns - files/folders to exclude from linting
    ignores: [
      "dist/**",
      "node_modules/**",
      "docs/**",              // Not in tsconfig.json
      "*.reference.ts",       // Reference files not in project
      "**/*.reference.ts"     // Reference files anywhere
      // Note: Removed "**/*.d.ts" so type definition files ARE linted
    ]
  },
  {
    files: ["**/*.{js,mjs,cjs,ts,mts,cts}"],
    plugins: { js },
    extends: ["js/recommended"],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    }
  },
  {
    files: ["**/*.ts", "**/*.mts", "**/*.cts"],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        tsconfigRootDir: import.meta.dirname,
        projectService: true
      }
    },
    plugins: {
      "@typescript-eslint": tseslint.plugin,
    },
    rules: {
      // === Type Checking Rules ===
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/explicit-function-return-type": "off",

      // === Commonly Used Rules (commented examples) ===

      // Require explicit return types on functions and class methods
      // "@typescript-eslint/explicit-function-return-type": "error",

      // Require explicit return and argument types on exported functions
      // "@typescript-eslint/explicit-module-boundary-types": "error",

      // Disallow unused variables
      // "@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_" }],

      // Require consistent type imports
      // "@typescript-eslint/consistent-type-imports": "error",

      // Disallow @ts-<directive> comments
      // "@typescript-eslint/ban-ts-comment": "error",

      // Require Array<T> instead of T[]
      // "@typescript-eslint/array-type": ["error", { "default": "generic" }],

      // Enforce naming conventions
      // "@typescript-eslint/naming-convention": [
      //   "error",
      //   { "selector": "interface", "format": ["PascalCase"] },
      //   { "selector": "typeAlias", "format": ["PascalCase"] }
      // ],

      // Disallow non-null assertions (!)
      // "@typescript-eslint/no-non-null-assertion": "error",

      // Require Promise-like values to be handled appropriately
      // "@typescript-eslint/no-floating-promises": "error",

      // Disallow async functions with no await
      // "@typescript-eslint/require-await": "error",

      // Enforce consistent use of type assertions
      // "@typescript-eslint/consistent-type-assertions": ["error", { "assertionStyle": "as" }],

      // Disallow unnecessary type arguments
      // "@typescript-eslint/no-unnecessary-type-arguments": "error",

      // Warn on unused expressions
      // "@typescript-eslint/no-unused-expressions": "warn",

      // Require switch statements to be exhaustive
      // "@typescript-eslint/switch-exhaustiveness-check": "error",
    }
  },
  // Separate configuration for .d.ts files
  {
    files: ["**/*.d.ts"],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        tsconfigRootDir: import.meta.dirname,
        projectService: true
      },
    },
    plugins: {
      "@typescript-eslint": tseslint.plugin,
    },
    rules: {
      // Type definition files often have different patterns
      "@typescript-eslint/no-explicit-any": "off",
      "no-var": "warn",

      // === Additional .d.ts specific rules (commented examples) ===

      // Allow empty interfaces in type definitions
      // "@typescript-eslint/no-empty-interface": "error",

      // Allow namespace declarations in .d.ts files
      // "@typescript-eslint/no-namespace": "error",

      // Allow triple-slash references in .d.ts files
      // "@typescript-eslint/triple-slash-reference": "off",
    }
  }
]);

export default config;