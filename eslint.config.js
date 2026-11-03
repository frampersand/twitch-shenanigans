import js from "@eslint/js";
import globals from "globals";

export default [
  {
    ignores: ["node_modules/", "data/", "public/libs/", "public/assets/"],
  },
  js.configs.recommended,
  {
    // Server, scripts and tests
    files: ["index.js", "src/**/*.js", "test/**/*.js", "eslint.config.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: globals.node,
    },
  },
  {
    // Overlays and admin panel (socket.io and tinycolor are loaded as page globals)
    files: ["public/**/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: { ...globals.browser, io: "readonly", tinycolor: "readonly" },
    },
  },
  {
    // Runs in both Node and the browser
    files: ["shared/**/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {},
    },
  },
  {
    rules: {
      "no-unused-vars": ["error", { args: "none", caughtErrors: "none" }],
    },
  },
];
