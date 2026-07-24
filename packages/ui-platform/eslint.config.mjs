import nx from "@nx/eslint-plugin"
import baseConfig from "../../eslint.config.mjs"

export default [
  ...nx.configs["flat/angular"],
  ...nx.configs["flat/angular-template"],
  ...baseConfig,
  {
    files: ["**/*.json"],
    rules: {
      "@nx/dependency-checks": [
        "error",
        {
          ignoredDependencies: [
            '@averos/core',
            '@angular/cdk',
            '@angular/common',
            '@angular/compiler',
            '@angular/core',
            '@angular/forms',
            '@angular/material',
            '@angular/platform-browser',
            '@angular/router',
            `@angular/localize`,
            '@angular/service-worker',
            'rxjs',
            'tslib',
            'zone.js',
            'file-saver',
            'firebase',
            'keycloak-js'
        ],
          ignoredFiles: ["{projectRoot}/eslint.config.{js,cjs,mjs,ts,cts,mts}"],
        },
      ],
    },
    languageOptions: {
      parser: await import("jsonc-eslint-parser"),
    },
  },
  {
    files: ["**/*.ts"],
    rules: {
      "@angular-eslint/directive-selector": [
        "error",
        {
          type: "attribute",
          prefix: "lib",
          style: "camelCase",
        },
      ],
      "@angular-eslint/component-selector": [
        "error",
        {
          type: "element",
          prefix: "lib",
          style: "kebab-case",
        },
      ],
    },
  },
  {
    files: ["**/*.html"],
    // Override or add rules here
    rules: {},
  },
]
