import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    // Ignore patterns - files/folders to exclude from linting
    ignores: [
      "dist/**",
      "node_modules/**",
      "docs/**",              // Not in tsconfig.json
      "*.reference.ts",       // Reference files not in project
      "**/*.reference.ts"     // Reference files anywhere
    ]
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{js,mjs,cjs,ts,mts,cts}"],
    languageOptions: {
      globals: globals.node,
    }
  },
  {
    files: ["**/*.ts", "**/*.mts", "**/*.cts"],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        projectService: true,
      }
    },
    rules: {
      // === Type Checking Rules ===
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/explicit-function-return-type": "off",
      "@typescript-eslint/no-unused-vars": "off",
    }
  },
  // Separate configuration for .d.ts files
  {
    files: ["**/*.d.ts"],
    rules: {
      // Type definition files often have different patterns
      "@typescript-eslint/no-explicit-any": "off",
      "no-var": "warn",
      "@typescript-eslint/no-empty-interface": "error",
      "@typescript-eslint/no-namespace": "error",
    }
  }
);
