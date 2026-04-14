import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import { Config, defineConfig } from "eslint/config";

const config: Config[] = defineConfig([
  {
    ignores: [
      "dist/**",
      "node_modules/**",
      "docs/**",
      "*.reference.ts",
      "**/*.reference.ts",
    ]
  },
  {
    files: ["**/*.{js,mjs,cjs,ts,mts,cts}"],
    plugins: { js },
    extends: ["js/recommended"],
    languageOptions: {
      globals: globals.browser,
      parserOptions: {
        project: "./tsconfig.json"
      }
    }
  },
  {
    files: ["**/*.ts", "**/*.mts", "**/*.cts"],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: "./tsconfig.json",
        tsconfigRootDir: import.meta.dirname,
        projectService: true
      }
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/explicit-function-return-type": "off",
    }
  },
]);

export default config;
