# Launchpad — Product Requirements Document

| | |
|---|---|
| **Product** | Launchpad — Programmable Banking Starter Kits |
| **Repository** | [`Investec-Developer-Community/investec-developer-starter-kits`](https://github.com/Investec-Developer-Community/investec-developer-starter-kits) |
| **Owner** | nickbenson |
| **Date** | 2026-11-05 |
| **Status** | Draft v1. Items marked **(proposed)** do not exist yet. |

> Launchpad is an independent community prototype. It is **not** an official Investec service. It never connects to a bank, asks for credentials or moves money.

---

## 1. Summary

Launchpad is a static web app for South African developers who are learning Investec Programmable Banking (the Private Bank account API and programmable cards). You pick an outcome, try it in the browser, then download a small Node script with fictional mock JSON and run it locally. Every kit includes attribution, known limitations, notes on how its mock data differs from the official API, and a manual checklist. Progress is saved in your browser only.

The frontend (`artifacts/starter-kits`) is ready for GitHub Pages, with workflows, base-path handling, static route entries and regression suites in place. This PRD describes the current product, how it is deployed and what comes next.

## 2. Problem

- Developers who are new to programmable banking have to deal with OAuth credentials, sandbox setup and API drift before they see anything work.
- Community projects (listed in the [Investec Developer Community Projects directory](https://github.com/Investec-Developer-Community/Community-Projects)) are useful, but they may target older APIs, need cloud services, or have unclear licences.
- Mistakes in banking and card code are costly. A wrong card rule declines real purchases, and wrong transfer logic moves real money. Learners need somewhere safe to make mistakes.

## 3. Goals

1. **Get to a first working result in about 15 minutes.** You go from landing page to a local run against fictional data without credentials or a network connection.
2. **Make it safe by design.** There is no bank connection, no secrets and no money movement. Every script is dry-run only.
3. **Credit sources honestly.** Community-inspired kits credit the original authors, record licence status and source-review dates, and state that no upstream code was copied unless it was. Illustrative kits are labelled as Launchpad examples.
4. **Prepare learners for the real API.** Show where the mock data differs from the documented Investec OpenAPI contracts (Private Bank 1.0.1, Card 1.0.0, Authorisation 1.0.0, reviewed 2026-10-14). Point to the official sandbox and the community simulator as next steps.
5. **Host as a static site.** Run on GitHub Pages under either the root path or a repository subpath, with no server, database or runtime secrets.

## 4. Non-goals

- Live API calls, OAuth flows or storing credentials, in the browser or in kits.
- Real transfers, card-code deployment or production-ready banking logic.
- User accounts, syncing, publishing, bookmarks or "recent activity". Bookmarks and a Saved page are out of scope; `/saved` redirects home.
- AI or ML features, cloud integrations (Telegram, Make, Google Sheets) or notification delivery. Kits only preview these outputs.
- Hosting or reproducing community applications. Launchpad links to them and writes its own narrow teaching versions.
- Implying endorsement by Investec.

## 5. Personas

| Persona | Description | Needs |
|---|---|---|
| **Curious SA developer** ("first-timer") | Knows JS. Has heard of Investec programmable banking but has no credentials or sandbox setup. | One obvious starting kit, a copy-paste command, the expected output and no setup friction. |
| **Hackathon / community builder** | Has seen community projects and wants a safe base to fork for an idea. | Clear provenance and licence, logic that can be modified, and notes on where mock data differs from the API. |
| **Programmable-card experimenter** | Wants to write `beforeTransaction` / `afterTransaction` card code. | A rule sandbox, cents vs major-unit guidance, and links to the Card API, the community simulator and `ipb`. |
| **Maintainer / contributor** | Keeps kits accurate as APIs and upstream repos change. | Read-only drift checks, deterministic tests, a clear review process and issue routing. |

## 6. Current product inventory (from code)

### 6.1 Routes (`src/App.tsx`, wouter, base-aware)

| Route | Page | Purpose |
|---|---|---|
| `/` | `pages/library.tsx` | Hero ("Pick an outcome. Try it here. Run it locally on fictional data."), a recommended beginner kit (Spend Explorer), "Continue where you left off" for partly completed checklists, search, category/difficulty filters (language filter shown only if there is more than one language), sorting (name, difficulty, time, added order), result count, empty state with reset. |
| `/kits/:slug` | `pages/kit-detail.tsx` | Sections: `#try` (browser demo), `#run` (ZIP, script or JSON download, command, expected output, setup steps, checklist and reset, local troubleshooting), `#api-notes` (official docs, auth note, mock vs API differences), `#sources` (credit, licence, source-review status, limitations). Unknown slug shows a not-found message. |
| `/getting-started` | `pages/getting-started.tsx` | First local run with Spend Explorer, "Take it further" (official sandbox vs Devin Pearson's community simulator), simulator setup commands with safety notes, official docs plus auth note, six safety rules. |
| `/reference` | `pages/reference.tsx` + `api-mapping-guide.tsx` | Advanced material: card mock vs REST vs runtime, account mock row vs `data.transactions` envelope, pending/posted/refund scenarios, field mappings with checks that run live in the browser. |
| `/saved` | redirect | Redirects to `/` and keeps stored progress. |
| `*` | `pages/not-found.tsx` | Also emitted as `404.html` so Pages returns a real HTTP 404. |

The shell (`components/shell.tsx`) has a Launchpad wordmark, primary and mobile navigation, a link to the official Investec Developer portal, and a zebra footer.

### 6.2 Kit catalogue (`src/data/kits.ts`, `community-kits.ts`, `learning-kits.ts`)

There are 9 kits. All are JavaScript, need Node 18+, have no dependencies, and ship as `<slug>.mjs`, `<slug>-mock-data.json` and a generated `README.md` in a ZIP.

| # | Slug | Name | Category | Difficulty / min | Origin & credit | Browser demo | Official API docs mapped |
|---|---|---|---|---|---|---|---|
| 1 | `interest-maximiser` | Interest Maximiser | Savings | Intermediate / 25 | Community: Frikkie Snyman (`investec-tools`, OfferZen article) | `InterestDemo` | Private Bank + Auth |
| 2 | `spend-explorer` | Spend Explorer | Insights | Beginner / 15 | Illustrative (Launchpad original) | `SpendDemo` | Private Bank + Auth |
| 3 | `card-guard` | Mock Card Rules | Card controls | Advanced / 30 | Illustrative. Explicitly unrelated to CSTech's "Card Guard". | `CardDemo` | Card + Auth |
| 4 | `payment-pinger` | Payment Pinger | Notifications | Beginner / 15 | Community: Roberto Aldera (MIT) | `PingerDemo` | Card + Auth |
| 5 | `card-to-sheet-sync` | Card-To-Sheet-Sync | Insights | Intermediate / 20 | Community: Dominic Santo (README claims MIT; no licence file verified) | `SheetDemo` (formula-safe CSV) | Card + Auth |
| 6 | `swipe-n-save` | Swipe 'n Save | Savings | Intermediate / 20 | Community: Peter Smythe (MIT) | `SwipeDemo` | Card + Private Bank + Auth |
| 7 | `cashflow-runway` | Cashflow Runway | Insights | Beginner / 15 | Community-inspired: Sean Gordon, Randall Erasmus (MIT) | `RunwayDemo` | Private Bank + Auth |
| 8 | `recurring-payment-detective` | Recurring Payment Detective | Insights | Intermediate / 20 | Community-inspired: Randall Erasmus / LifePilot (MIT) | `RecurringDemo` | Private Bank + Auth |
| 9 | `who-paid` | Who Paid? | Accounting | Intermediate / 20 | Community-inspired: @bandilleee / Qualis (no licence grant verified) | `ReconciliationDemo` | Private Bank + Auth |

Notes:

- Kits 7–9 ("learning kits") share one engine (`src/data/learning-engines.mjs`: `forecast`, `detectRecurring`, `reconcile`). It uses integer minor units with an explicit currency and fixed UTC dates. The downloaded engine source is generated by `build/generate-learning-source.mjs` and tested to be byte-identical to the browser engine.
- Each script starts with an API guidance header from `apiDownloadNote(slug)`.
- Source review status: kits 7–9 have `checkedOn: 2026-11-04`. Kits 1, 4, 5 and 6 have `checkedOn: null` and `licenceSha256: null`, so the UI shows "Source review not yet recorded". No community kit has an approved licence hash yet.
- `scripts/official-api-baseline.json` is intentionally empty (`documents: {}`), so `review:api` exits 1 until a maintainer approves baselines.

### 6.3 Client-side capabilities

- **Demos:** 9 interactive calculators/simulators in `components/demos.tsx`, `community-demos.tsx` and `learning-demos.tsx`. They validate input and have reset.
- **Downloads:** single files through Blob URLs, plus a ZIP built in the browser with a hand-written "store" ZIP writer that includes CRC-32 (`lib/starter-bundle.ts`, no dependency).
- **Command copy:** `command-block.tsx` uses the clipboard API. If copying fails, the text can still be selected.
- **Progress:** `localStorage` key `launchpad.v1` holds `{ progress: { [slug]: string[] } }`. It tolerates malformed data per kit and ignores obsolete bookmark entries (`lib/local.ts`). Progress is stored per browser origin and is not moved between hosts.
- **Social preview:** Open Graph and Twitter metadata with an absolute image URL taken from `PUBLIC_SITE_URL` (`build/social-preview.ts`).
- **Static routes:** a Vite plugin copies the shell into `getting-started/`, `reference/`, `saved/` and `kits/<slug>/index.html`, and adds `404.html` and `.nojekyll` (`build/static-routes.ts`).

### 6.4 Other workspace packages (not part of the static site)

| Package | What it is | Needed for Pages? |
|---|---|---|
| `artifacts/api-server` | Express 5 scaffold with only `GET /api/healthz` | **No** |
| `lib/db` | Drizzle/Postgres scaffold with an empty schema. `DATABASE_URL` is only required here. | **No** |
| `lib/api-spec`, `lib/api-zod`, `lib/api-client-react` | OpenAPI (healthz only) → Orval codegen | **No.** The frontend lists `api-client-react` as a devDependency but does not import it. |
| `artifacts/mockup-sandbox` | Design/mockup preview server (defaults `PORT`/`BASE_PATH`) | **No** — not part of the Pages build |
| `scripts/` | Maintainer review CLIs (`review:sources`, `review:api`) and the CI adapter | No (CI only) |

## 7. User flows

1. **First run (primary):** Library → "New here? Start with Spend Explorer" → *Try demo* (`#try`) → *Run locally* (`#run`) → download the ZIP → `node spend-explorer.mjs ./spend-explorer-mock-data.json` → compare with the expected output → tick checklist steps.
2. **Outcome browse:** Library → search (name, tagline, summary, category, author) or filter by category/difficulty → kit card → kit detail.
3. **Guided onboarding:** Header → Getting started → Step 1 bundle/script/data downloads → troubleshooting → "Take it further" (official sandbox or community simulator).
4. **Resume:** Return visit → "Continue where you left off" lists kits with partly completed checklists → `#run`.
5. **Go deeper:** Kit `#api-notes` → Reference (`/reference#card-mapping`, `#account-mapping`, `#pending-refunds`, `#field-mappings`) → official API reference (external).
6. **Provenance check:** Kit `#sources` → original repo, licence status, source-review status, limitations.
7. **Maintainer review:** `pnpm review:sources` / `pnpm review:api` (read-only) → a human inspects → manually updates `checkedOn` / `licenceSha256` / baseline approvals → PR.

## 8. Functional requirements

Status: ✅ exists · 🟡 partial · ⬜ proposed.

| ID | Requirement | Status |
|---|---|---|
| FR-1 | Library lists every kit in `kits` with search, category/difficulty filters, four sort modes, result count and empty-state reset. | ✅ |
| FR-2 | Each kit has a browser demo that uses the same logic as its downloadable script. Learning-kit engines are byte-identical by test. | ✅ (byte-identity only for kits 7–9) |
| FR-3 | Each kit offers a ZIP (script + mock JSON + README with provenance and limitations), individual downloads, the exact run command and the expected output. | ✅ |
| FR-4 | Each kit shows limitations, API-difference notes, official doc links and the OAuth note. | ✅ |
| FR-5 | Community kits show authors, links, licence status, upstream/adaptation description and source-review status (with a 90-day overdue rule). Illustrative kits say they have no upstream. | ✅ |
| FR-6 | Manual checklist per kit, stored in the browser, with reset and library resume links. No automatic completion. | ✅ |
| FR-7 | Getting started: beginner first run, troubleshooting, sandbox/simulator comparison, safety rules. | ✅ |
| FR-8 | Reference: mock vs documented shapes, with checks that run live in the browser. | ✅ |
| FR-9 | `/saved` redirects home and keeps progress. Unknown routes show not-found with HTTP 404 on Pages. | ✅ |
| FR-10 | Social preview metadata with an absolute image URL on hosted builds. | ✅ |
| FR-11 | A new kit added to the catalogue automatically gets a static route entry, demo slot and tests. | 🟡 Routes are automatic. Demos are mapped by hand in `DemoFrame`, and unknown slugs **silently fall back to `CardDemo`**. |
| FR-12 | Contributor-facing "propose a kit" path (issue template, kit schema checklist). | ✅ `.github/ISSUE_TEMPLATE/` |
| FR-13 | Root `README.md` describing the product, local development and the disclaimer. | ✅ |

## 9. Non-functional requirements

| ID | Requirement | How it's enforced today |
|---|---|---|
| NFR-1 **No credentials / no bank** | No secrets, OAuth, bank hosts or runtime fetch/XHR in the site. Scripts are offline and use only Node built-ins. | `tests/static/hosting.spec.ts` fails on runtime fetch/XHR and on requests outside the hosting prefix. Scripts use only `node:fs`. |
| NFR-2 **Static hosting** | Works under `/` and `/<repo>/` with no SPA fallback. Deep links, refresh, anchors and 404 all work. | `test:static` builds both base paths and serves them with a plain Node server (`tests/static/server.mjs`). |
| NFR-3 **Accessibility** | Keyboard operable (navigation disclosure, filters, code scrollers), visible focus, labelled landmarks and sections, `sr-only` new-tab hints, reduced motion. | `test:responsive` checks focus, Tab order and Enter/Space. Its README says this is "not a complete WCAG audit". **Gap:** no automated axe/contrast checks (proposed). |
| NFR-4 **Responsive** | No horizontal overflow at 320, 390 or 1440 px. Bounded code/table scrollers. | `test:responsive` geometry assertions and screenshot baselines (0.2% tolerance). Baselines cover only 3 of the 9 kit pages. |
| NFR-5 **Honest attribution** | Real attribution only for verified projects. Illustrative kits labelled as such. Third-party brand assets have recorded permission. | `public/brand/SOURCES.md`, `source-review` tests, maintainer review. |
| NFR-6 **Reproducible builds** | Node 24.10.0, pnpm 10.26.1, frozen lockfile, any OS. | `.nvmrc`, `packageManager` and `engines` pin versions; workflows read them. |
| NFR-7 **Supply-chain hygiene** | Minimal permissions, `persist-credentials: false`, Pages write and OIDC only in the deploy job. | `github-pages.yml`, `static-hosting.yml`. Pages workflows use tags (`@v4`). |
| NFR-8 **Privacy** | No analytics, cookies or accounts. Only `localStorage` checklist IDs. | Code inspection. `robots.txt` present. |
| NFR-9 **Performance** | Single JS bundle. Works without a backend. | Not measured (proposed Lighthouse budget). |

## 10. Architecture

```
pnpm workspace (Node 24, TS 5.9)
├── artifacts/starter-kits   ← THE PRODUCT (React 19.1 + Vite 7 + Tailwind 4 + shadcn/Radix, wouter)
│   ├── src/data/            kit catalogue, fixtures, learning engines, official-API notes
│   ├── src/components/      demos, shell, command block, API mapping guide
│   ├── src/lib/             localStorage progress, ZIP writer
│   ├── src/maintenance/     read-only review CLIs + node:test suites
│   ├── build/               Vite plugins: static-routes, social-preview; learning-source generator
│   ├── tests/static         Playwright: root + subpath hosting
│   └── tests/responsive     Playwright: 320/390/1440 layout, keyboard, baselines
├── scripts/                 package wrapper for review/test CLIs; CI adapter; API baseline
├── artifacts/api-server     Express scaffold (healthz)       ─┐
├── lib/{db,api-spec,api-zod,api-client-react}                 ├─ unused by the static site
└── artifacts/mockup-sandbox design preview sandbox           ─┘
```

Build: `BASE_PATH=/<repo>/ PUBLIC_SITE_URL=<pages url> pnpm --filter @workspace/starter-kits build` runs `generate-learning-source.mjs --check` and then `vite build`, writing to `artifacts/starter-kits/dist/public/`. Only that folder is published.

Key decisions are recorded in [`docs/decisions/product-guardrails.md`](./decisions/product-guardrails.md):

- No live banking in v1. Device-local progress only. No bookmarks.
- Organise around choose kit → try → run locally → adapt. Keep deep API material in `/reference`.
- Community kits are narrow, independently written teaching examples, not imports.
- Visual style matches the Investec Developer portal. The hero and wordmark are kept on the basis of **owner-confirmed** permission (not independently verified). The zebra artwork was supplied by the owner.

## 11. Quality gates and tests

| Gate | Command | Runs in CI? | What it proves |
|---|---|---|---|
| Typecheck | `pnpm run typecheck` | ⬜ No workflow | TS across libs, artifacts and scripts |
| Learning engines | `pnpm --filter @workspace/scripts test:learning-kits` | ✅ `static-hosting.yml` (PR) | Engine maths, edge cases, ZIP CRCs, byte-identical downloaded engine, catalogue preservation |
| API mappings | `pnpm --filter @workspace/scripts test:mappings` | ⬜ Not wired | Reference-page checks, exact ZAR→cents |
| Social preview | `pnpm --filter @workspace/starter-kits test:social` | ✅ PR + Pages build | OG/Twitter metadata and image delivery |
| Static hosting | `pnpm --filter @workspace/starter-kits test:static` | ✅ PR | Root and subpath routes, refresh, assets, 404, demos, ZIP, clipboard, progress, branding, learning kits |
| Responsive / a11y | `pnpm --filter @workspace/starter-kits test:responsive` | ⬜ Local only | Layout and keyboard at 3 widths, screenshot baselines |
| Source review tests | `pnpm test:sources` | ⬜ Not wired | Offline safety of the source checker |
| API review tests | `pnpm test:api-review` | ✅ weekly `official-api-review.yml` | Offline safety of the contract checker |
| Official API drift | `node scripts/ci-review-api.mjs` | ✅ weekly (Mon 07:23 UTC) + manual | Read-only drift detection. **Fails until baselines are approved.** |
| Source drift | `pnpm review:sources` | ⬜ Manual | Upstream links, licence hashes, 90-day freshness |

Definition of done for any kit or UI PR: `test:static`, `test:social` and `test:learning-kits` pass in CI. `test:responsive` passes locally with any baseline changes reviewed. Maintainers review scope and safety, and check test assertions.

## 12. Deployment

### 12.1 What gets deployed

Only `artifacts/starter-kits/dist/public`. **The API server, Postgres/Drizzle, `DATABASE_URL` and `.env` are not needed** for static hosting and must not be deployed. No repository secrets are required for Pages.

### 12.2 GitHub Pages configuration

- Settings → Pages → Source is **GitHub Actions**. If the `github-pages` environment has protection rules, allow the default branch.
- The base path is set automatically. `actions/configure-pages@v5` supplies `base_path` (`/<repo-name>/` for a project site, `/` for a user or organisation site or custom domain) and `base_url`, which becomes `PUBLIC_SITE_URL`. Renaming the repository or changing the domain requires a rebuild, and `localStorage` progress is tied to the origin.
- The site deploys on push to the default branch, or by running **Starter kits GitHub Pages** manually.
- For the full setup and troubleshooting steps, see [`artifacts/starter-kits/GITHUB_PAGES.md`](../artifacts/starter-kits/GITHUB_PAGES.md).

### 12.3 Workflow applicability

### 12.3 Workflow applicability

| Workflow | Trigger | Applies to Pages? | Needs |
|---|---|---|---|
| `github-pages.yml` | push (default branch only, by `if`), manual | **Yes: deploys** | Pages source = Actions |
| `static-hosting.yml` | pull_request | **Yes: PR gate** | Nothing extra (Playwright installs Chromium) |
| `official-api-review.yml` | weekly cron, manual | No (maintenance) | Fails until `official-api-baseline.json` is approved. Schedules are paused after 60 days with no activity on public repos. |

Recommended (proposed): branch protection on `main` requiring the `Static routes and base paths` check, plus a typecheck job.

## 13. Risks

| ID | Risk | Likelihood / impact | Mitigation |
|---|---|---|---|
| R-2 | Users read Launchpad as official Investec, or treat kits as production-ready | Med / High | Disclaimers on every page and script, the "not official" header link, copy review |
| R-4 | API drift makes mapping notes stale. Baseline is empty, so the weekly job is always red. | High / Med | Baseline approval; 90-day review cadence |
| R-5 | Upstream licence changes or repo deletion (4 kits have no recorded review) | Med / Med | `review:sources`; record the missing reviews |
| R-6 | Brand asset rights (Investec logo and hero) rest on owner confirmation only | Low / High | `SOURCES.md` record. Be ready to swap assets quickly (proposed). |
| R-8 | `localStorage` progress lost on host or domain change | Certain / Low | Documented. Data is not moved between origins. |
| R-9 | Unused scaffolds (API server, DB, mockup sandbox) confuse contributors or widen the dependency surface | Med / Low | Kept but excluded from the Pages build and labelled in README. |
| R-10 | New kit added without a demo mapping silently renders `CardDemo` | Med / Med | P1 guard and test |

## 14. Open questions

1. Who is the named human maintainer for `reviewedBy` in API baseline approvals and for source-review sign-off?
2. Is there appetite for more languages (Python, C#) given the `language` filter already exists?
3. Should Launchpad be proposed for listing in the Investec Community Projects directory, and does that need Investec DevRel sign-off?

## 15. Roadmap (prioritised, issue-sized)

Each item is one issue.

### P0: Operations

| ID | Work item | Owner | Acceptance |
|---|---|---|---|
| P0-1 | Approve the initial official API baselines following `API_ALIGNMENT.md` so the weekly job is green | Maintainers (human approval required) | `review:api` exits 0 on `main` |

### P1: Quality and trust

| ID | Work item | Owner | Acceptance |
|---|---|---|---|
| P1-1 | CI workflow: `pnpm run typecheck`, `test:mappings`, `test:sources` on PRs | Maintainers | Required check on `main` |
| P1-2 | Branch protection: require static-hosting and the P1-1 checks | Maintainers | Settings applied |
| P1-3 | Record source reviews for Interest Maximiser, Payment Pinger, Card-To-Sheet-Sync and Swipe 'n Save (`checkedOn`, `licenceSha256`) | Maintainers | `review:sources` exits 0 or has documented exceptions |
| P1-4 | Automated accessibility checks (axe) on every route at 390 and 1440 px | Maintainers | Zero serious or critical violations |
| P1-5 | Extend responsive baselines and containment tests to all 9 kit pages | Maintainers | Baselines committed and reviewed |
| P1-6 | Guard `DemoFrame`: fail the build or tests when a kit slug has no demo, instead of falling back to `CardDemo` | Maintainers | Test fails for an unmapped slug |
| P1-7 | Byte-identity or parity tests between demo logic and downloaded scripts for kits 1–6 (as already exists for 7–9) | Maintainers | Each kit's script output matches its demo for the fixture |
| P1-8 | Run `test:responsive` in CI in a pinned Playwright Linux container | Maintainers | Green on PR with no flaky diffs over 10 runs |

### P2: Contributor experience and growth

| ID | Work item | Owner | Acceptance |
|---|---|---|---|
| P2-1 | Devcontainer for contributors (optional) | Maintainers | New contributor builds on macOS through the devcontainer |
| P2-2 | New kit: card-code `beforeTransaction` rule playground that maps mock input to the documented runtime shape | Maintainers | Meets the FR-2–FR-5 checklist |
| P2-3 | New kit candidates sourced from the Community Projects directory (with verified licences only) | Maintainers | Each kit is credited and source-reviewed |
| P2-4 | Lighthouse performance/SEO budget in CI | Maintainers | Budget enforced |
| P2-5 | Dependency updates (Playwright, Vite, actions tags → SHA pins for the Pages workflows) | Maintainers | CI green |

---

*References:* `artifacts/starter-kits/GITHUB_PAGES.md`, `artifacts/starter-kits/tests/responsive/README.md`, `scripts/SOURCE_REVIEW.md`, `scripts/API_ALIGNMENT.md`, `public/brand/SOURCES.md`, `.github/workflows/*`, `docs/decisions/product-guardrails.md`.
