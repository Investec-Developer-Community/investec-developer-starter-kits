# Brand asset provenance

This file records where Launchpad's brand assets come from and the basis on which
they are used. It is kept in the repository and is not published to the website.
Asset paths below are relative to `artifacts/starter-kits/public/`.

## Investec reference assets

Retrieved 2026-10-14 from the public Investec Developer Portal at
https://developer.investec.com/ for Launchpad's visual alignment.

| Local file | Source |
| --- | --- |
| `brand/investec-developer-logo.png` | https://developer.investec.com/investec-developer-logo.png |
| `brand/hero-card.jpg` | https://developer.investec.com/hero-card.jpg |

These are third-party assets, not original Launchpad artwork, and are not covered
by any Launchpad code licence. Public availability does not establish permission,
and the portal's https://developer.investec.com/terms-of-use does not grant
Investec intellectual-property rights. Do not imply Investec endorsement.

### Permission basis

On 2026-10-14 the Launchpad maintainer explicitly confirmed permission to publicly
redistribute the Investec hero image and developer wordmark. Both assets are
retained on that basis.

The maintainer-provided originals in `attached_assets/` match the deployed assets
byte for byte:

| Original | Deployed file | SHA-256 |
| --- | --- | --- |
| `0_hero-card_1791960102934.jpg` | `brand/hero-card.jpg` | e201e1a71dee6b4aa12b7bd9c550862b813b8332e4f51cfca31c8fe9b56f577c |
| `0_InvestecDeveloper-Logo_1791960129440.png` | `brand/investec-developer-logo.png` | 734bb6ba73a15317293ea27a3b2c395443ceef308f0d376d3a78ff43f5ce722e |

This records the maintainer's confirmation. It is not an independently verified
licence or a grant of permission on behalf of Investec. No separate permission
document, usage conditions or additional attribution requirements were supplied.
The confirmation covers these two assets for Launchpad's public distribution;
do not infer approval for other assets or projects, or endorsement.

Launchpad remains an independent community prototype. The on-page attribution
and no-bank-connection/mock-only notices must remain visible.

## Zebra mark

On 2026-11-04 the Launchpad maintainer supplied
`attached_assets/Zebra-minimal-black-transp_1793807519854.png` and explicitly
offered it for Launchpad's favicon and other placements within this design system.
This records maintainer-supplied permission for this project, not independently verified ownership, a transferable
licence or official Investec endorsement.

The original is an indexed 568 × 568 PNG with transparency (transparent corner,
artwork bounds 458 × 393). The original file is unchanged. No AI redrawing, tracing
or recolouring was used. Transparent padding was trimmed, then the silhouette was
centred without changing proportions and resized using Lanczos filtering.

Derived files:
- `brand/launchpad-zebra.png`: transparent 96 × 96 mark, displayed at 36px in the
  header and 28px in the footer.
- `favicon-16.png` and `favicon-32.png`: size-specific PNGs with white backing to
  retain contrast on light and dark browser tabs.
- `apple-touch-icon.png`: 180 × 180 icon with the same white backing.

Reproduce with `bash artifacts/starter-kits/build/generate-zebra-assets.sh`
from the repository root (ImageMagick required only when regenerating assets,
not for building or hosting the website).

## Social preview

`brand/launchpad-social.png` is a 1200 × 630 PNG composition of the same zebra
mark and Launchpad text, with the independent-community and no-endorsement
disclaimer. The zebra is resized proportionally from the original, not redrawn
or recoloured. The permission scope above applies unchanged: this project only,
with no claim of independently verified ownership or endorsement.

Reproduce with `bash artifacts/starter-kits/build/generate-social-preview.sh`
(ImageMagick and DejaVu Sans required only for regeneration).
