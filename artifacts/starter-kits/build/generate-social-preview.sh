#!/usr/bin/env bash
# Manual preparation only; ImageMagick and DejaVu Sans are not build dependencies.
set -euo pipefail
root="$(cd "$(dirname "$0")/../../.." && pwd)"
source="$root/attached_assets/Zebra-minimal-black-transp_1793807519854.png"
output="$root/artifacts/starter-kits/public/brand/launchpad-social.png"
magick -size 1200x630 xc:'#f6f5f2' \
  \( "$source" -trim +repage -filter Lanczos -resize 270x270 \) \
  -gravity northwest -geometry +76+142 -composite \
  -font DejaVu-Sans -fill '#182535' -pointsize 76 -annotate +410+237 'Launchpad' \
  -pointsize 30 -annotate +414+299 'Programmable Banking' \
  -annotate +414+344 'Starter Kits' \
  -stroke '#d4d7da' -strokewidth 1 -draw 'line 80,458 1120,458' \
  -stroke none -fill '#4c5967' -pointsize 23 \
  -annotate +80+515 'Independent community prototype' \
  -pointsize 20 -annotate +80+553 'No bank connection. No real money. No Investec endorsement.' \
  -strip "$output"
