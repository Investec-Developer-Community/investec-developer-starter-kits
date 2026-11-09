# Launchpad — Programmable Banking Starter Kits

[![Starter kits GitHub Pages](https://github.com/Investec-Developer-Community/investec-developer-starter-kits/actions/workflows/github-pages.yml/badge.svg)](https://github.com/Investec-Developer-Community/investec-developer-starter-kits/actions/workflows/github-pages.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)

**Built by the Investec Developer Community.** Read the [Investec Developer documentation](https://developer.investec.com/).

Launchpad is a mock-first inspiration and learning showcase for South African developers exploring Investec Programmable Banking (the Private Bank account API and programmable cards). Its static website and downloadable starter kits use sample data to demonstrate patterns aligned with official API and card-code mechanics.

**Project status:** Launchpad is an independent community project, not affiliated with Investec. The public website is static and credential-free, and browser demos use bundled sample data. Downloadable kits are mock boilerplate for exploring ideas—not sandbox or production integrations. Developers who want to continue can follow the official [Investec Developer documentation](https://developer.investec.com/) and adapt the patterns for their own projects. To try real API calls, use the [official Investec sandbox](https://developer.investec.com/api-reference/SA%20PB%20Account%20Information#description/sandbox) or the [Community sandboxes](https://github.com/Investec-Developer-Community/Community-Projects#-sandboxes--local-development). Launchpad only links to them: it does not ask for credentials or call them. No production integration is offered or implied.

**Live site:** https://investec-developer-community.github.io/investec-developer-starter-kits/

## Features

- **Outcome-first kits:** each kit starts from something you want to build, not from an API endpoint.
- **Browser demos:** use bundled sample data and do not call an API.
- **Mock-first boilerplate:** explore API and card-code patterns with sample data, then follow links to official developer resources for future steps.
- **Honest attribution:** community-inspired kits credit their original authors and record licence status and source-review dates.
- **Documented mechanics:** kits explain how their sample data relates to documented Investec API and card-code mechanics; samples do not establish a live integration.
- **Manual checklists:** progress is saved in your browser only.

## Repository structure

| Path | Purpose | Deployed to Pages? |
|---|---|---|
| `artifacts/starter-kits` | The Launchpad website (React, Vite, Tailwind) | Yes |
| `scripts` | Engine-source generator, maintainer review CLIs and the offline test runner | No |
| `docs` | Architecture map and product guardrails | No |

The workspace has only these two packages: `artifacts/starter-kits` and `scripts`. The earlier server, design-preview and generated-client scaffolds were removed; git history keeps them. See [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) for the full architecture.

## Prerequisites

- **Node.js 24.10.0** for repository and website development; this is the version used in CI. Other repository/site-development versions are not verified.
- Downloaded kits have a separate target minimum of **Node.js 20.12**; this does not change the repository/site-development requirement above.
- **pnpm 10.26.1**, the version used in CI. The root `preinstall` script rejects `npm` and `yarn`.
- **Linux x64** is the verified platform. CI builds and tests on `ubuntu-24.04`. Playwright suites run in the `mcr.microsoft.com/playwright:v1.64.1-noble` container.

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

# All offline unit and maintenance suites (what CI runs): engine-source check,
# every src/maintenance/**/*.test.{ts,mjs} file, and the CI adapter tests.
# The ZIP checks need python3 on your PATH.
pnpm --filter @workspace/starter-kits test:unit

# Offline tests for the review tooling
pnpm --filter @workspace/scripts test:sources
pnpm --filter @workspace/scripts test:api-review
```

Kit, API, and card-code tests use sample fixtures or local fakes only; never run tests against live services. If a transfer example is ever added, it must be sandbox-only with explicit safety checks. Production transfer execution is not supported.

Responsive screenshot baselines are generated in the pinned Playwright container. Do not regenerate them on other platforms, because pixel output differs. To refresh them, run the CI workflow manually with `update_snapshots` enabled and download the baselines artifact.

## Deployment

The site deploys to GitHub Pages from the [`github-pages.yml`](./.github/workflows/github-pages.yml) workflow. A push to the default branch builds the site with base path `/investec-developer-starter-kits/` and publishes it.

Repository owners must set **Settings → Pages → Source** to **GitHub Actions**. See [`artifacts/starter-kits/GITHUB_PAGES.md`](./artifacts/starter-kits/GITHUB_PAGES.md) for setup, local build options, static routing and troubleshooting.

## Documentation

- [Architecture map](./docs/ARCHITECTURE.md)
- [Product guardrails](./docs/decisions/product-guardrails.md)
- [Source review process](./scripts/SOURCE_REVIEW.md)
- [API alignment](./scripts/API_ALIGNMENT.md)
- [GitHub Pages guide](./artifacts/starter-kits/GITHUB_PAGES.md)

## Contributing, security and conduct

- [Contributing guide](./CONTRIBUTING.md)
- [Security policy](./SECURITY.md). Do not report vulnerabilities in public issues.
- [Code of Conduct](./CODE_OF_CONDUCT.md)

## Licence

Released under the [MIT Licence](./LICENSE).
