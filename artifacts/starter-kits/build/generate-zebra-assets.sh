#!/usr/bin/env bash
# Manual asset preparation, not a deployment dependency. Requires ImageMagick.
set -euo pipefail
root="$(cd "$(dirname "$0")/../../.." && pwd)"
source="$root/attached_assets/Zebra-minimal-black-transp_1793807519854.png"
output="$root/artifacts/starter-kits/public"
# Trim transparent padding only; use a square canvas without distorting the mark.
magick "$source" -trim +repage -background none -gravity center -extent 490x490 \
  -filter Lanczos -resize 96x96 -strip "$output/brand/launchpad-zebra.png"
# White backing keeps the black artwork visible in both light and dark tab chrome.
for size in 16 32 180; do
  target="$output/favicon-${size}.png"
  if [ "$size" = 180 ]; then target="$output/apple-touch-icon.png"; fi
  magick "$source" -trim +repage -background none -gravity center -extent 510x510 \
    -filter Lanczos -resize "${size}x${size}" -background white -alpha remove -alpha off \
    -strip "$target"
done
