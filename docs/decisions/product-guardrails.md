# Product guardrails

Durable product and content guardrails for Launchpad. Each entry states the rule, why it exists and how to apply it.

## Product scope

Launchpad is a mock-first inspiration and learning showcase. Its browser demos and downloadable boilerplate use sample data to teach patterns that match official API and programmable-card mechanics. The goal is to help developers try ideas and point them to official next steps—not to provide or validate a sandbox or production integration.

| Area | Rule |
|---|---|
| Identity and brand | Do not use an Investec or Investec Developer logo or the Investec hero image. Use a plain text link to <https://developer.investec.com/>. Reconsider a logo only after written approval from Investec brand/legal, recorded in `artifacts/starter-kits/BRAND_ASSETS.md`; maintainer confirmation alone is not that approval. |
| Hosting | Keep the site on GitHub Pages at <https://investec-developer-community.github.io/investec-developer-starter-kits/>. |
| Credentials and live services | Launchpad examples use sample data and do not require credentials, live calls, or sandbox/production setup. Link developers to official Investec documentation for any next steps they choose to take independently. Never place personal credentials in examples or the public site. |
| Sandbox links (D-2, 2026-11-06) | Launchpad stays mock-only. It may link to the [official Investec sandbox](https://developer.investec.com/api-reference/SA%20PB%20Account%20Information#description/sandbox) and the [Community sandboxes](https://github.com/Investec-Developer-Community/Community-Projects#-sandboxes--local-development) as next steps, but it never asks for, stores or packages credentials and never calls either sandbox at runtime. Linking does not mean Launchpad has verified sandbox behaviour. |
| Card checks | Demonstrate card-code mechanics with sample inputs and documented behavior; testing or deploying against a real card is not a Launchpad requirement. |
| Kit Node version | Downloaded kits target Node.js 20.12 or later. This does not change the separate repository/site toolchain requirement. |
| Kit names | Use kit display names without “Mock” while preserving existing slugs, routes and progress keys. |
| Offline validation | Tests use fixtures or local fakes only. Never run tests against live services. |
| Transfers | If an example ever includes transfer execution, it must be sandbox-only and guarded by explicit safety checks; production transfer execution must never be shown as supported. |

These guardrails do not assert that any sandbox or production integration is available or verified.

## Official API references

**Rule:** Use <https://developer.investec.com/> and its current OpenAPI documents to align sample payloads, terminology, and mechanics. Link to the official documentation as the next step for developers who choose to continue beyond Launchpad. Use community repositories only for original project attribution.

**Why:** The Developer Portal publishes the current contracts, so Launchpad's API guidance has to follow it.

**How to apply:**

- Recheck official definitions when changing API-related guidance. Do not treat outdated community samples as current contracts, and do not claim compatibility beyond the documented shapes and mechanics that have been reviewed.
- Use sample fixtures shaped to reflect the relevant official responses and card-code inputs. A future consumer may adapt these patterns, but local live mode and fixture/live parity are not Launchpad requirements. Preserve existing checklist progress (`launchpad.v1` and step IDs); do not change it to match bank payloads.

## Visual reference and brand assets

**Rule:** The Investec Developer Portal may inform visual reference, but Launchpad has its own identity. Use no Investec/Investec Developer logo or Investec hero image; link to the portal with plain text only.

**Why:** A logo can imply endorsement and public availability or maintainer confirmation does not establish Investec approval.

**How to apply:**

- Do not imply Investec endorsement. The previous maintainer confirmation for the hero image and developer wordmark is not Investec brand/legal approval. Withhold the Investec logo/wordmark unless Investec brand/legal gives written approval; record its exact scope in `artifacts/starter-kits/BRAND_ASSETS.md` before any use.
- The minimal zebra artwork used for the favicon and similar placements was supplied by the maintainer. Use it rather than inventing a replacement; record its provenance as maintainer-supplied.
- Use the approved site name and community attribution below. Keep the community attribution distinct from any claim of Investec endorsement.

**Approved site identity and status wording:**

- Site name: **Launchpad — Programmable Banking Starter Kits**
- Attribution: **Built by the Investec Developer Community**
- Status: **Open-source starter kits built by the Investec Developer Community. Explore ideas with sample data and use the official Investec Developer documentation for next steps. This static site never asks for or stores credentials.**

This wording describes Launchpad's mock-first showcase, not a live integration. The website remains static, credential-free and makes no runtime API calls. Do not imply production integrations are available today or present pending checks as completed.

## Developer journey

**Rule:** Organise Launchpad around: choose an idea → try its sample-data demo → inspect or run the mock boilerplate locally → adapt it, then follow links to official next steps. Keep API mapping and transaction scenarios in the reference area rather than repeating them per kit.

**Why:** A quicker path to a first working result matters most. Technical depth and repeated caveats in the main flow obscure it.

**How to apply:**

- Put files, the exact mock run command and the expected sample output together. Make clear that browser demos and downloaded examples use sample data. Local live mode, credential configuration, and live API parity are optional adaptations for future consumers—not Launchpad deliverables.
- Keep the public website static and credential-free: no credential inputs, embedded personal credentials, or runtime API calls. Link to the official Developer Portal for future setup instructions; do not present sandbox or production integrations as available in Launchpad today.
- Tests use fixtures or local fakes only, never live services. If a sample ever includes transfer execution, keep it sandbox-only with explicit safety checks; never imply production transfer execution is supported.
- Community-inspired kits are narrow, independently written teaching examples, not imports of full upstream applications. Explain each adaptation beside the original author and source (for example, explicit-invoice matching is a deliberate simplification of Qualis's transaction-pattern idea). Do not imply upstream compatibility or treat community README claims as official API capabilities.

## Checklist scope

**Rule:** Keep the catalogue directly browsable without Saved or bookmarks. Resume entries represent incomplete manual checklist progress, not recent activity.

**Why:** The catalogue is small enough to browse directly. Accounts, syncing, automatic completion and recent-activity tracking are out of scope.

**How to apply:** Preserve existing browser-local checklist data when simplifying navigation. Do not reintroduce bookmarks or imply that running a demo or downloading a file completes a step.

## Responsive regression coverage

**Rule:** Overflow checks must inspect element and text bounds, not just document scroll width. Wider content is allowed only inside bounded, intentionally scrollable code/table containers.

**Why:** The shell's horizontal clipping can hide off-screen content while reporting no page scrollbar; narrow layouts exposed grid-sizing and long-unbroken-text issues.

**How to apply:** Keep these checks when changing responsive layouts. Do not fix failures by hiding overflow or by automatically accepting new screenshot baselines. See `artifacts/starter-kits/tests/responsive/README.md`.
