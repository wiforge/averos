# Contributing to Averos

Thanks for your interest in contributing to Averos! This document covers
everything you need to know to get a change merged, from local setup to
the legal formalities.

## Code of Conduct

This project follows the [Averos Code of Conduct](./CODE_OF_CONDUCT.md).
By participating, you're expected to uphold it in all interactions
within the project.

## Scope

This guide covers the public `averos` monorepo only — the packages listed
below, all released under the MIT License. The proprietary
`averos-forge` monorepo (`@averos/core`, `@averos/dag-engine`,
`@averos/executor`) is maintained separately by Wiforge and does not
accept external contributions.

| Package | Description |
|---|---|
| `@averos/cli` | Command-line tooling for scaffolding and managing Averos projects |
| `@averos/ai` | AI orchestration layer powering Averos' AI-driven application generation |
| `@averos/mcp` | Model Context Protocol integration for Averos tooling |
| `@averos/workflow` | Workflow and DAG orchestration utilities for the public layer |
| `@averos/ui-platform` | Angular-based UI platform and component library |
| `apps/averos-application` | Reference/example application built on the Averos stack |

See each package's own `README.md` for package-specific details.

## Before You Start: Sign the CLA

**All contributions require signing the [Averos Contributor License
Agreement](./CLA.md) before a pull request can be merged.**

In short: you keep full ownership and copyright of your contribution, but
you grant Wiforge a broad license to use it — including in Wiforge's
commercial and proprietary offerings, not just the open-source Project.
We call this out explicitly here, not just in the CLA text, because we'd
rather you know upfront than find out later. Read the full [CLA.md](./CLA.md)
for the exact terms.

You'll be prompted to accept the CLA automatically the first time you
open a pull request.

## Prerequisites

- **Node.js** 20 LTS or newer
- **pnpm** (this repo uses pnpm workspaces — please don't use `npm` or
  `yarn` install commands, as they won't respect the workspace/catalog
  configuration)
- **Nx CLI** (available via `pnpm exec nx` — no separate global install
  required)
- **Git**

## Local Setup

```bash
# 1. Fork the repo, then clone your fork
git clone https://github.com/wiforge/averos.git
cd averos

# 2. Install dependencies
pnpm install

# 3. Build all packages
pnpm exec nx run-many -t build

# 4. Run the test suite
pnpm exec nx run-many -t test

# 5. Lint
pnpm exec nx run-many -t lint
```

Look at `averos/package.json.scripts` section for the full list of commands used in this project.


### A note on `@averos/core`

`@averos/ui-platform` declares `@averos/core` as a **peer dependency**,
by design — this enforces a single dependency-injection singleton
instance across the app. If you're working on `ui-platform` and hitting
DI-related errors, check that you're not accidentally getting a second
copy of `@averos/core` resolved into your `node_modules` tree.

## How to Contribute

1. **Check existing issues** first — look for `good first issue` or
   `help wanted` labels if you're new here.
2. **For anything non-trivial, open an issue or discussion before
   writing code.** This avoids wasted effort on approaches that won't be
   merged.
3. **Branch naming:** `feat/short-description`, `fix/short-description`,
   `docs/short-description`, etc.
4. **Commit messages:** please follow [Conventional Commits](https://www.conventionalcommits.org/)
   (`feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`) — this
   repo's changelogs and release tooling depend on it.
5. **Keep pull requests focused.** Small, single-purpose PRs get
   reviewed and merged much faster than large mixed-purpose ones.
6. **Add or update tests** for any behavioral change.
7. **Update documentation** (README, JSDoc/TSDoc comments) if your
   change affects public APIs.

## Coding Standards

- TypeScript strict mode is enforced — please don't add `// @ts-ignore`
  without a comment explaining why it's necessary.
- Run `pnpm exec nx run-many -t lint` before opening a PR; CI will block
  merges on lint failures.
- Follow existing conventions in the package you're touching —
  particularly `workspace:*` for internal monorepo dependencies, and the
  peer-dependency pattern described above where applicable.

## Pull Request Process

1. Sign the CLA (see above) — required before merge, not before review.
2. Ensure `pnpm exec nx affected -t lint test build` passes locally.
3. Open your PR against `main`, using the PR template.
4. Clearly describe **what** changed and **why** — link the related
   issue if one exists.
5. A maintainer will review and may request changes. Please be patient;
   this is currently a small maintainer team.
6. Once approved, PRs are typically squash-merged to keep history clean.

## Reporting Bugs and Requesting Features

Please use GitHub Issues. For bug reports, include:
- Steps to reproduce
- Expected vs. actual behavior
- Package name and version, Node/pnpm version, OS

## Reporting Security Vulnerabilities

**Please do not open a public issue for security vulnerabilities.** Email
**averos.tech@gmail.com** directly with details, and allow time for a fix
before any public disclosure.

## License

By contributing, you agree that your contributions to the packages
listed above will be released under the **MIT License**, and that your
contribution is subject to the terms of the [Averos CLA](./CLA.md).

## Questions?

Open a GitHub Discussion, or reach out at **averos.tech@gmail.com**.

---

*Thank you for helping build Averos.*