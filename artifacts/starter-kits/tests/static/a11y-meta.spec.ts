import { test, expect } from "@playwright/test";
import { readdir, readFile } from "node:fs/promises";
import { basename, join, resolve } from "node:path";
import { PROJECT_STATUS_TEXT } from "../../src/data/project-status";
import { SITE_DESCRIPTION, SITE_IMAGE_ALT } from "./site-meta";

const builds = [
  {
    name: "root deployment",
    path: "../../../../generated-artifacts/static-hosting/root",
  },
  {
    name: "repository deployment",
    path: "../../../../generated-artifacts/static-hosting/repository",
  },
];
const obsoleteTrustCopy =
  /\bprototype\b|\bmock(?:ed)?(?:[-\s]+data)?[-\s]+only\b|\bnot[-\s]+real\b|\bno[-\s]+real[-\s]+money\b/i;
const description = SITE_DESCRIPTION;
const imageAlt = SITE_IMAGE_ALT;

function getMetaContent(html: string, attribute: string, value: string) {
  const escaped = value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const tag = html.match(
    new RegExp(
      `<meta\\b(?=[^>]*\\b${attribute}=["']${escaped}["'])[^>]*>`,
      "i",
    ),
  )?.[0];
  return tag?.match(/\bcontent=["']([^"']*)["']/i)?.[1];
}

test(
  "every built route keeps accurate metadata and a zoomable viewport",
  async ({}, testInfo) => {
    test.skip(
      testInfo.project.name !== "root",
      "Both deployment builds are checked by one test.",
    );

    for (const build of builds) {
      const output = resolve(import.meta.dirname, build.path);
      const indexFiles = (await readdir(output, { recursive: true })).filter(
        (file) => basename(file) === "index.html",
      );
      expect(
        indexFiles.length,
        `built routes in ${build.name}`,
      ).toBeGreaterThan(0);

      for (const file of indexFiles) {
        const html = await readFile(join(output, file), "utf8");
        const statusElements = [
          ...html.matchAll(
            /<aside\b(?=[^>]*\bdata-testid=["']project-status["'])[^>]*>([\s\S]*?)<\/aside>/gi,
          ),
        ];
        expect(
          statusElements,
          `raw project status in ${build.name}/${file}`,
        ).toHaveLength(1);
        const rawStatusText = statusElements[0]![1]!
          .replace(/<[^>]*>/g, " ")
          .replace(/\s+/g, " ")
          .trim();
        expect(rawStatusText, `project status copy in ${build.name}/${file}`).toBe(
          PROJECT_STATUS_TEXT,
        );

        const metadata = [
          ...html.matchAll(
            /<title\b[^>]*>[\s\S]*?<\/title>|<meta\b[^>]*>/gi,
          ),
        ]
          .map(([tag]) => tag)
          .join(" ");
        expect(
          metadata,
          `metadata in ${build.name}/${file}`,
        ).not.toMatch(obsoleteTrustCopy);
        for (const [attribute, value] of [
          ["name", "description"],
          ["property", "og:description"],
          ["name", "twitter:description"],
        ]) {
          expect(
            getMetaContent(html, attribute, value),
            `${value} in ${build.name}/${file}`,
          ).toBe(description);
        }
        for (const [attribute, value] of [
          ["property", "og:image:alt"],
          ["name", "twitter:image:alt"],
        ]) {
          expect(
            getMetaContent(html, attribute, value),
            `${value} in ${build.name}/${file}`,
          ).toBe(imageAlt);
        }

        const meta = html.match(
          /<meta\b(?=[^>]*\bname=["']viewport["'])[^>]*>/i,
        )?.[0];
        expect(meta, `viewport meta in ${build.name}/${file}`).toBeDefined();
        const content = meta?.match(/\bcontent=["']([^"']*)["']/i)?.[1];
        expect(content, `viewport content in ${build.name}/${file}`).toBe(
          "width=device-width, initial-scale=1",
        );
      }
    }
  },
);
