# Contributing

Thanks for helping developers learn Investec Programmable Banking. Launchpad is an independent community prototype, not an official Investec service. Please read this guide before opening a pull request.

## Ground rules

- **Mock data only.** Kits must never connect to a bank, call a live API or ask for credentials.
- **No secrets.** Never commit credentials, tokens, `.env` files or real account, card or customer data. Use fictional data.
- **Verified attribution.** If a kit is inspired by a community project, credit the original authors, record the licence and state the review date. Do not copy upstream code unless its licence allows it and the kit says so.
- **Dry run only.** Scripts must not move money or change real card rules.

## Setup

Follow the [Quick start](./README.md#quick-start) in the README. You need Node.js 24.10.0 and pnpm 10.26.1.

## Workspace map

See [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md). Most contributions touch `artifacts/starter-kits`. Changes to `lib/*` are generated code and need their spec in `lib/api-spec` updated first (`pnpm --filter @workspace/api-spec run codegen`).

Product rules that shape kits and UI (official API references, brand assets, developer journey, checklist scope, responsive checks) are in [`docs/decisions/product-guardrails.md`](./docs/decisions/product-guardrails.md).

## Maintainer reviews

These are read-only and need network access. They never approve anything on their own.

- `pnpm review:sources` — upstream source review. Exit code 1 means a human needs to review. See [`scripts/SOURCE_REVIEW.md`](./scripts/SOURCE_REVIEW.md).
- `pnpm review:api` — official OpenAPI drift check. It never approves baselines. See [`scripts/API_ALIGNMENT.md`](./scripts/API_ALIGNMENT.md).

## Tests

Run the checks that match your change before opening a pull request:

| Change type | Commands |
|---|---|
| Any code | `pnpm run typecheck` |
| Site build or routing | `pnpm --filter @workspace/starter-kits build` then `pnpm --filter @workspace/starter-kits test:static` |
| Social metadata | `pnpm --filter @workspace/starter-kits test:social` (after a build) |
| Kit content or mappings | `pnpm --filter @workspace/scripts test:learning-kits` and `pnpm --filter @workspace/scripts test:mappings` |
| Source review | `pnpm --filter @workspace/scripts test:sources` |
| UI layout | `pnpm --filter @workspace/starter-kits test:responsive` |

Responsive screenshot baselines are regenerated on Linux (Ubuntu) runners. Do not commit baselines generated on macOS or Windows. If a layout change needs new baselines, say so in the pull request and let CI produce them.

## Adding or changing a kit

Each kit must include:

- Origin and credit, including original authors and links
- Licence status, and whether any upstream code was copied
- Source-review date
- Known limitations
- How the mock data differs from the official API
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
