# Contributing

Thanks for helping developers learn Investec Programmable Banking. Launchpad is an independent community prototype, not an official Investec service. Please read this guide before opening a pull request.

## Ground rules

- **Mock data only.** Kits must never connect to a bank, call a live API or ask for credentials.
- **No secrets.** Never commit credentials, tokens, `.env` files or real account, card or customer data. Use fictional data.
- **Documented mechanics only.** Shape fictional fixtures from documented API responses and card-code inputs/mechanics. Link to the [official Investec Developer documentation](https://developer.investec.com/), and label local derivations and unknown behavior as such rather than presenting assumptions as official.
- **No live setup.** Launchpad examples and tests do not require credentials or sandbox/production setup.
- **Verified attribution.** If a kit is inspired by a community project, credit the original authors, record the licence and state the review date. Do not copy upstream code unless its licence allows it and the kit says so.
- **Dry run only.** Scripts must not move money or change real card rules.

## Setup

Follow the [Quick start](./README.md#quick-start) in the README. You need Node.js 24.10.0 and pnpm 10.26.1.

## Workspace map

See [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md). The workspace has two packages: `artifacts/starter-kits` (the site) and `scripts` (generator, review CLIs and test runner). Most contributions touch `artifacts/starter-kits`.

Kit logic lives in `artifacts/starter-kits/src/data/*-engine.mjs` (plus `sample-helpers.mjs` and `learning-engines.mjs`). Edit the `.mjs` file, never the generated `*-source.ts` files, then run `pnpm --filter @workspace/scripts generate:kit-sources`. The build fails if the generated sources are stale.

A new kit needs its slug in `src/data/kit-slugs.ts` and a demo in `src/lib/demo-registry.ts`. A missing demo is a type error.

Product rules that shape kits and UI (official API references, brand assets, developer journey, checklist scope, responsive checks) are in [`docs/decisions/product-guardrails.md`](./docs/decisions/product-guardrails.md).

## Maintainer reviews

These are read-only and need network access. They never approve anything on their own.

- `pnpm review:sources` — upstream source review. Exit code 1 means a human needs to review. It also runs monthly in `source-review.yml`. See [`scripts/SOURCE_REVIEW.md`](./scripts/SOURCE_REVIEW.md).
- `pnpm review:api` — official OpenAPI drift check. It never approves baselines. It also runs weekly in `official-api-review.yml`. See [`scripts/API_ALIGNMENT.md`](./scripts/API_ALIGNMENT.md).

These network jobs run only on a schedule or manual dispatch. They are never pull request gates.

## Tests

Run the matching fixture/local-fake tests offline before opening a pull request. Never replace them with calls to a live service or bank environment.

| Change type | Commands |
|---|---|
| Any code | `pnpm run typecheck` |
| Kit logic, fixtures, mappings, downloads or copy | `pnpm --filter @workspace/starter-kits test:unit` (needs `python3`) |
| Site build or routing | `pnpm --filter @workspace/starter-kits build` then `pnpm --filter @workspace/starter-kits test:static` |
| Social metadata | `pnpm --filter @workspace/starter-kits test:social` (after a build) |
| Source or API review tooling | `pnpm test:sources` and `pnpm test:api-review` |
| UI layout or accessibility | `pnpm --filter @workspace/starter-kits test:responsive` |

`test:unit` runs `@workspace/scripts` `test:offline`: the engine-source check (`check:kit-sources`), every `artifacts/starter-kits/src/maintenance/**/*.test.{ts,mjs}` file (`test:maintenance`, with the shared network guard) and the CI adapter tests (`test:ci-adapter`). New maintenance tests are picked up automatically. The per-file `test:*` scripts in `scripts/package.json` remain for local use.

Responsive screenshot baselines come from the pinned Playwright container (`mcr.microsoft.com/playwright:v1.64.1-noble`). Do not commit baselines generated on macOS or Windows. If a layout change needs new baselines, say so in the pull request; a maintainer runs the CI workflow manually with `update_snapshots` and commits the uploaded artifact.

## Adding or changing a kit

Each kit must include:

- Origin and credit, including original authors and links
- Licence status, and whether any upstream code was copied
- Source-review date
- Known limitations, local derivations and unknown behavior
- Fictional fixtures shaped from documented API responses and card-code mechanics, with links to official documentation and a clear account of how samples differ from official behavior
- A browser demo and a downloadable mock-data script
- A manual checklist

To suggest a kit before you build one, open a feature request and include the checklist above.

## Branches and pull requests

- Use a short, descriptive branch name, for example `<issue-number>-<kebab-case-slug>`.
- Keep pull requests focused on one change.
- Complete the checklist in the pull request template, including screenshots for UI changes.
- Link the issue you are fixing with `Closes #<number>`.

## Reporting bugs and security issues

- Bugs and feature requests: use the issue templates.
- Security issues: do not open a public issue. Follow [SECURITY.md](./SECURITY.md).
- Never post real banking credentials or personal data in an issue or pull request.

## Conduct

By participating, you agree to follow the [Code of Conduct](./CODE_OF_CONDUCT.md).

## Licence

By contributing, you agree that your contributions are licensed under the [MIT Licence](./LICENSE).
