# Product guardrails

Durable product and content decisions for Launchpad. Each entry states the rule, why it exists and how to apply it.

## Official API references

**Rule:** Use <https://developer.investec.com/> and its current OpenAPI documents for API-contract alignment. Use community repositories only for original project attribution.

**Why:** The Developer Portal publishes the current contracts, so Launchpad's API guidance has to follow it.

**How to apply:**

- Recheck official definitions when changing API-related guidance. Do not treat outdated community samples as current contracts, and do not claim simplified mock demos are API-compatible without verification.
- Keep API mapping examples separate from existing starter inputs and downloads. Extend the mapping guide independently; do not change starter fixture schemas or persisted progress to match bank payloads.

## Visual reference and brand assets

**Rule:** Use the current Investec Developer Portal as Launchpad's visual reference (overall look and feel, not only colours) while keeping Launchpad's independent community identity.

**Why:** The portal's visual style is the reference for Launchpad's look and feel.

**How to apply:**

- Preserve existing attribution and never imply endorsement. The portal terms reviewed on 2026-10-14 did not grant Investec IP rights; public availability of an asset is not permission to redistribute it.
- The current hero image and developer wordmark are retained on the basis of the maintainer's explicit confirmation (2026-10-14) of permission for public redistribution. Describe this as maintainer-confirmed, not independently verified or granted on Investec's behalf. Do not extend it to other assets or projects. The legal record is `artifacts/starter-kits/BRAND_ASSETS.md`; the maintainer-supplied originals are kept in `attached_assets/`.
- The minimal zebra artwork used for the favicon and similar placements was supplied by the maintainer. Use it rather than inventing a replacement; record its provenance as maintainer-supplied.

## Developer journey

**Rule:** Organise Launchpad around: choose a kit → try its browser demo → run it locally → adapt it. Keep shared API mapping and transaction scenarios in the reference area rather than repeating them per kit.

**Why:** A quicker path to a first working result matters most. Technical depth and repeated caveats in the main flow obscure it.

**How to apply:**

- Put files, the exact run command and the expected result together. Keep attribution and mock-only boundaries visible; link to deeper material without removing its verification limits. Preserve established kit inputs and manually saved progress.
- Present the official sandbox and the community stateful simulator as external next steps after a successful local run, not as embedded runtime integrations. Keep Launchpad offline and credential-free; keep the fuller comparison in Getting started.
- Community-inspired kits are narrow, independently written teaching examples, not imports of full upstream applications. Explain each adaptation beside the original author and source (for example, explicit-invoice matching is a deliberate simplification of Qualis's transaction-pattern idea). Do not imply upstream compatibility or treat community README claims as official API capabilities.

## Checklist scope

**Rule:** Keep the catalogue directly browsable without Saved or bookmarks. Resume entries represent incomplete manual checklist progress, not recent activity.

**Why:** The catalogue is small enough to browse directly. Accounts, syncing, automatic completion and recent-activity tracking are out of scope.

**How to apply:** Preserve existing browser-local checklist data when simplifying navigation. Do not reintroduce bookmarks or imply that running a demo or downloading a file completes a step.

## Responsive regression coverage

**Rule:** Overflow checks must inspect element and text bounds, not just document scroll width. Wider content is allowed only inside bounded, intentionally scrollable code/table containers.

**Why:** The shell's horizontal clipping can hide off-screen content while reporting no page scrollbar; narrow layouts exposed grid-sizing and long-unbroken-text issues.

**How to apply:** Keep these checks when changing responsive layouts. Do not fix failures by hiding overflow or by automatically accepting new screenshot baselines. See `artifacts/starter-kits/tests/responsive/README.md`.
