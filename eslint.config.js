// @ts-check

import js from "@eslint/js";
import prettier from "eslint-plugin-prettier";
import tseslint from "typescript-eslint";
import { defineConfig } from "eslint/config";

export default defineConfig(
    {
        // Everything outside build/ is copied from pf2e and is not ours to lint.
        ignores: [
            "client/**/*",
            "common/**/*",
            "*.d.mts",
            "node_modules/**/*",
        ],
    },
    { plugins: { prettier } },
    {
        files: ["build/**/*.ts"],
        extends: [js.configs.recommended, tseslint.configs.recommended],
        languageOptions: {
            ecmaVersion: 2024,
            sourceType: "module",
            parserOptions: { project: "./tsconfig.json" },
        },
        rules: {
            curly: ["error", "multi-line", "consistent"],
            eqeqeq: "error",
            "prettier/prettier": "error",
            "no-console": "off",
            "no-var": "error",
            "spaced-comment": ["error", "always", { markers: ["/"] }],
            "@typescript-eslint/array-type": ["error", { default: "array" }],
            "@typescript-eslint/explicit-module-boundary-types": [
                "error",
                { allowHigherOrderFunctions: true },
            ],
        },
    },
);
