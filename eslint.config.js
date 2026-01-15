import js from "@eslint/js";
import tseslint from "typescript-eslint";
import importPlugin from "eslint-plugin-import";
import globals from "globals";

export default [
  js.configs.recommended,

  // TypeScript recommended rules
  ...tseslint.configs.recommended,

  {
    files: ["**/*.{ts,tsx,js,jsx}"],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.browser,
        ...globals.es2022,
      },
    },
    plugins: {
      import: importPlugin,
    },
    rules: {
      // Keep Nova behavior stable: avoid “helpful” unused-vars refactors breaking gates
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],

      // We allow `any` in a few places for Express middleware and proxy edges
      "@typescript-eslint/no-explicit-any": "off",

      // Imports sanity
      "import/order": [
        "warn",
        {
          "newlines-between": "always",
          alphabetize: { order: "asc", caseInsensitive: true },
        },
      ],
    },
  },

  {
    ignores: ["node_modules", "dist", "build", ".replit", "attached_assets"],
  },
];
