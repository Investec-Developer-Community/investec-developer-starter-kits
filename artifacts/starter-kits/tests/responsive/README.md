# Responsive and keyboard regressions

Run from the workspace root:

```sh
pnpm --filter @workspace/starter-kits test:responsive
```

The suite builds and serves the real frontend on port 4179, without the API
server or development overlays. Each test gets fresh browser storage. Nothing
downloads files or changes saved progress. Coverage runs at 320×800, 390×844 and
1440×900 in Chromium:

- library, all three kit pages, mapping panels and onboarding;
- desktop navigation and the mobile disclosure's names, expanded state, tab
  order, Enter/Space operation and closure after following a link;
- real Tab navigation and visible focus on links, search, sort, filters,
  disclosure summaries and scrollable code;
- full-document element and text geometry, including content hidden by the
  global `overflow-x:clip`; intentionally bounded code/table scrollers are allowed;
- keyboard horizontal scrolling within API examples;
- reviewed screenshot baselines for the shell, open mobile menu, page headers,
  mapping guide, onboarding and focus state.

This is focused coverage, not a complete WCAG audit. Screenshot comparisons
cover selected surfaces; the geometry assertions inspect the entire document,
including sections below the fold.

## Browser and baseline maintenance

Install Playwright's bundled browser with `pnpm --filter @workspace/starter-kits exec playwright
install chromium`. Use a consistent Linux/browser/font environment when comparing
or updating baselines; browser upgrades can legitimately change rendering.

Baselines are small intentional test fixtures under `baselines/` and belong in
Git. A normal run **fails** on missing baselines and never accepts new images.
For intentional visual changes:

```sh
pnpm --filter @workspace/starter-kits test:responsive:update
pnpm --filter @workspace/starter-kits test:responsive
```

Inspect the image diffs before committing; never update baselines just to silence
a failure. Animations are disabled and local images/fonts finish loading before
capture. The allowed pixel difference is 0.2%, to tolerate minor rasterization
noise, not layout shifts. Screenshots, traces, diffs and the HTML report from
runs go into the ignored `generated-artifacts/responsive/` directory.

Section-only screenshots hide the sticky header during capture so it cannot
cover the section title; page and shell screenshots retain it.

## CI baseline refresh (Ubuntu)

Responsive baselines must be regenerated on Ubuntu CI runners (not macOS).
Run **CI** manually with `update_snapshots=true` (Actions → CI → Run workflow),
then download the `responsive-baselines-ubuntu-*` artifact and replace
`tests/responsive/baselines/` with those files in your branch. Re-run:

```sh
pnpm --filter @workspace/starter-kits test:responsive
```

The workflow also uploads `responsive-report-*` artifacts on failures.
