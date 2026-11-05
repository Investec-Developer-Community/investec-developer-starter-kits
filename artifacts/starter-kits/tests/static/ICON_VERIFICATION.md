# Zebra browser and bookmark icon verification

## Result — 2026-11-04

**Asset checks pass; native browser/OS acceptance remains unverified.**
No application code or icon assets were changed during this verification.
This report uses the assignment's permitted unavailable-environment outcome;
it is not a Safari, iOS, or Chromium browser-chrome sign-off.

| Check | Result | Evidence / limitation |
| --- | --- | --- |
| PNG dimensions and delivery | PASS | `pnpm --filter @workspace/starter-kits test:static branding.spec.ts`: 2 tests passed, root and `/starter-kits/` builds, including nested routes, PNG signatures, MIME types and dimensions |
| Opaque backing | PASS | ImageMagick identifies all three PNGs as opaque, with white top-left pixels and black-to-white pixel range |
| Source-image silhouette | Inspected, not native acceptance | Directly viewed all three files: zebra profile remains visible; fine stripes are less distinct at 16px; 180px image has white padding and an intact profile |
| Safari tabs | NOT RUN | Linux host; no Safari, `safaridriver`, or Apple `xcrun` available; testing environment has no macOS Safari access |
| iOS Add to Home Screen | NOT RUN | No iOS device or simulator access; rounded OS mask, installed appearance and installation cache behavior cannot be observed |
| Chromium light tab theme | NOT RUN | Chromium 152.0.7977.64 is installed, but the available browser-testing interface exposes page content, not native tab chrome or browser-theme controls |
| Chromium dark tab theme | NOT RUN | Same native-chrome limitation; page color-scheme emulation is not evidence of a dark browser theme |
| Native icon cache refresh | NOT RUN | No previous installed icon/profile fixture or native UI evidence; successful image delivery does not establish browser favicon or home-screen cache replacement |

A display session exists on the host, but that alone does not provide native
browser-chrome verification through the available testing interface. The browser
tester confirmed these access limits and did not substitute a webpage test.
The static build emitted existing tooltip sourcemap warnings; both branding tests
completed successfully.

## Assets inspected

Paths below are relative to `artifacts/starter-kits/public/`. SHA-256 fingerprints
identify the exact files inspected, not future versions:

| File | Dimensions | SHA-256 |
| --- | --- | --- |
| `favicon-16.png` | 16 × 16 | `a73849dcfda112658742a5aba1c5bcf56cf37702713e99227ec9c5d43634abbd` |
| `favicon-32.png` | 32 × 32 | `f22b984496f26d99ecbe38a1ecbf4331caeffb142b7e2a4624434861641c6b18` |
| `apple-touch-icon.png` | 180 × 180 | `dac0ed96d43076fefe59a02ee541f8d88f7acf4dcab3c844a39e8181915a2f05` |

`index.html` declares the two PNG favicons and the 180px touch icon with
base-prefixed URLs. `build/generate-zebra-assets.sh` adds white backing.
The backing supports black-artwork contrast regardless of surrounding theme,
but its white square may remain visible in dark tabs. Whether that presentation
is acceptable must be judged in actual chrome, not inferred from PNG pixels.
Fixed filenames do not guarantee replacement of previously cached icons.

## Native-device completion procedure

Use an approved accessible build containing the fingerprints above. Do not
publish solely to perform this check. Record the URL/base path, build identity,
OS/browser versions, device model, display scale and browser theme for each run.
Use screenshots that include native tabs or the actual home screen, not just
the web viewport. Exercise both root and repository-path hosting where available,
including direct entry to a nested kit page.

1. **Safari on macOS:** enable website icons in tabs if necessary. In a fresh
   profile, open Launchpad in active and inactive tabs. Check light and dark
   appearance at normal tab size. Confirm the profile faces right, the muzzle,
   ears and neck remain recognizable, stripes do not collapse into an unreadable
   blob, and artwork is not clipped. Record native screenshots and verdicts.
2. **Chromium:** use actual light and dark browser themes, not DevTools page
   color-scheme emulation. Check active/inactive tabs at normal display scale
   and a high-density display if available. Record contrast of the zebra against
   its backing and the backing against tab chrome, silhouette and cropping.
   Do not assume which PNG the browser selected; record the requested asset if
   observable.
3. **iPhone/iPad Safari:** open the build and use Share → Add to Home Screen.
   Inspect both the installation preview and the installed icon. Confirm the
   rounded OS mask retains the ears, muzzle and neck without stretching or
   unexpected transparency. Open the installed shortcut and confirm the correct
   app/base path. Check normal and dark home-screen appearance; record tinted
   appearance separately on OS versions that support it.
4. **Cache refresh:** preserve a test profile/shortcut from the previous icon
   build, then visit the updated build at the same URL. Record behavior after
   ordinary reload, tab close/reopen and browser restart. On iOS, inspect the
   existing shortcut before removing anything, then compare a newly added one.
   If stale, use only an isolated test profile/site-data reset and remove/re-add
   the test shortcut, documenting which step worked. A fresh install passing
   does not prove existing installations update automatically.
5. For each case, record **PASS**, **FAIL** or **NOT RUN**, attach evidence, and
   describe any required refresh action. If icons remain stale, investigate a
   versioned icon URL in a separate change rather than claiming cache refresh
   passed. Do not clear the user's general browsing data.

No native results or screenshots are available from this run. The open matrix
above must remain unverified until actual browser/device evidence is collected.
