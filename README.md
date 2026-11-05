# Programmable Banking Starter Kits (Launchpad)

[![Starter kits GitHub Pages](https://github.com/Investec-Developer-Community/investec-developer-starter-kits/actions/workflows/github-pages.yml/badge.svg)](https://github.com/Investec-Developer-Community/investec-developer-starter-kits/actions/workflows/github-pages.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)

Launchpad helps South African developers learn Investec Programmable Banking (the Private Bank account API and programmable cards). Pick an outcome, try it in the browser, then download a small Node script that runs locally against fictional mock JSON. Nothing connects to a bank, asks for credentials or moves money.

> Launchpad is an independent community prototype. It is **not** an official Investec service.

**Live site:** https://investec-developer-community.github.io/investec-developer-starter-kits/

## Features

- **Outcome-first kits:** each kit starts from something you want to build, not from an API endpoint.
- **Browser demos:** try each kit without credentials or a network connection.
- **Downloadable scripts:** every kit ships as a dry-run Node script with fictional mock data.
- **Honest attribution:** community-inspired kits credit their original authors and record licence status and source-review dates.
- **Known limitations:** each kit explains how its mock data differs from the documented Investec OpenAPI contracts.
- **Manual checklists:** progress is saved in your browser only.

## Repository structure

| Path | Purpose | Deployed to Pages? |
|---|---|---|
| `artifacts/starter-kits` | The Launchpad website (React, Vite, Tailwind) | Yes |
| `artifacts/api-server` | Express scaffold kept for later use | No |
| `artifacts/mockup-sandbox` | Design preview server kept for later use | No |
| `lib/*` | Shared API spec, Zod schemas, React client and DB scaffolds | No |
| `scripts` | Maintainer CLIs and node:test suites (source and API review) | No |
| `docs` | Architecture map and product requirements | No |

See [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) for the full package map and dependency graph.

## Prerequisites

- **Node.js 24.10.0**, the version used in CI. Other versions are not verified.
- **pnpm 10.26.1**, the version used in CI. The root `preinstall` script rejects `npm` and `yarn`.
- **Linux x64** is the verified platform. CI builds and tests on `ubuntu-latest`.

Install pnpm with `npm install -g pnpm@10.26.1`.

## Quick start

```sh
# Install dependencies for the website only
pnpm install --frozen-lockfile --filter @workspace/starter-kits...

# Start the dev server (http://localhost:5173/)
pnpm --filter @workspace/starter-kits dev

# Build the static site into artifacts/starter-kits/dist/public
pnpm --filter @workspace/starter-kits build

# Typecheck the workspace
pnpm run typecheck
```

## Tests

```sh
# Social metadata tests (run after a build)
pnpm --filter @workspace/starter-kits test:social

# Static hosting tests: root and /starter-kits/ base paths (first run needs browsers)
pnpm --filter @workspace/starter-kits exec playwright install chromium
pnpm --filter @workspace/starter-kits test:static

# Responsive screenshot tests (run in CI on Linux)
pnpm --filter @workspace/starter-kits test:responsive

# Kit, mapping, source-review and API-review suites (offline)
pnpm --filter @workspace/scripts test:learning-kits
pnpm --filter @workspace/scripts test:mappings
pnpm --filter @workspace/scripts test:sources
pnpm --filter @workspace/scripts test:api-review
```

Responsive screenshot baselines are generated on Linux. Avoid regenerating them on other platforms, because pixel output differs.

## Deployment

The site deploys to GitHub Pages from the [`github-pages.yml`](./.github/workflows/github-pages.yml) workflow. A push to the default branch builds the site with base path `/investec-developer-starter-kits/` and publishes it.

Repository owners must set **Settings → Pages → Source** to **GitHub Actions**. See [`artifacts/starter-kits/GITHUB_PAGES.md`](./artifacts/starter-kits/GITHUB_PAGES.md) for setup, local build options, static routing and troubleshooting.

## Documentation

- [Architecture map](./docs/ARCHITECTURE.md)
- [Product requirements](./docs/PRD.md)
- [Source review process](./scripts/SOURCE_REVIEW.md)
- [API alignment](./scripts/API_ALIGNMENT.md)
- [GitHub Pages guide](./artifacts/starter-kits/GITHUB_PAGES.md)

## Contributing, security and conduct

- [Contributing guide](./CONTRIBUTING.md)
- [Security policy](./SECURITY.md). Do not report vulnerabilities in public issues.
- [Code of Conduct](./CODE_OF_CONDUCT.md)

## Licence

Released under the [MIT Licence](./LICENSE).
