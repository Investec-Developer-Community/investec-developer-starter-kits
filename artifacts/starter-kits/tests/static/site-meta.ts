import { readFileSync } from "node:fs";

// The shipped index.html is the source of truth for site metadata copy.
const html = readFileSync(new URL("../../index.html", import.meta.url), "utf8");

function sourceMeta(attribute: string, value: string) {
  const tag = html.match(new RegExp(`<meta\\b(?=[^>]*\\b${attribute}="${value}")[^>]*>`, "i"))?.[0];
  const content = tag?.match(/\bcontent="([^"]*)"/i)?.[1]?.trim();
  if (!content) throw new Error(`index.html is missing meta ${attribute}="${value}" content`);
  return content;
}

export const SITE_DESCRIPTION = sourceMeta("name", "description");
export const SITE_IMAGE_ALT = sourceMeta("property", "og:image:alt");
