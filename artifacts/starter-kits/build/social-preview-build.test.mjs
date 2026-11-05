import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { preview } from 'vite';

const root = path.resolve(import.meta.dirname, '..');
const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

async function htmlFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(entries.map(entry => {
    const file = path.join(directory, entry.name);
    return entry.isDirectory() ? htmlFiles(file) : file.endsWith('.html') ? [file] : [];
  }));
  return files.flat();
}

function meta(html, key) {
  const tags = html.match(/<meta\b[^>]*>/g) ?? [];
  const matching = tags.filter(tag => tag.includes(`property="${key}"`) || tag.includes(`name="${key}"`));
  assert.equal(matching.length, 1, `Expected exactly one ${key} tag`);
  const content = matching[0].match(/\bcontent="([^"]*)"/);
  assert.ok(content, `Missing ${key} content`);
  return content[1];
}

for (const base of ['/', '/starter-kits/']) {
  for (const published of [false, true]) {
    test(`built social preview: ${base}, ${published ? 'provider URL' : 'relative URL'}`, { timeout: 120_000 }, async () => {
      const outDir = await mkdtemp(path.join(tmpdir(), 'launchpad-social-'));
      // Simulate configure-pages base_url (no trailing slash). Never fetch this fixture host.
      const siteUrl = published ? `https://example.org${base.slice(0, -1)}` : '';
      const expectedImage = `${published ? 'https://example.org' : ''}${base}brand/launchpad-social.png`;
      let server;
      try {
        execFileSync('pnpm', ['exec', 'vite', 'build', '--outDir', outDir], {
          cwd: root,
          env: { ...process.env, BASE_PATH: base, PUBLIC_SITE_URL: siteUrl },
          stdio: 'pipe',
          timeout: 90_000,
        });
        const files = await htmlFiles(outDir);
        assert.ok(files.includes(path.join(outDir, 'index.html')), 'Missing built entry page');
        for (const file of files) {
          const html = await readFile(file, 'utf8');
          assert.ok(!html.includes('__LAUNCHPAD_SOCIAL_IMAGE__'), `Unresolved placeholder in ${file}`);
          assert.equal(meta(html, 'og:image'), expectedImage, file);
          assert.equal(meta(html, 'twitter:image'), expectedImage, file);
          assert.equal(meta(html, 'og:image:type'), 'image/png', file);
          assert.equal(meta(html, 'og:image:width'), '1200', file);
          assert.equal(meta(html, 'og:image:height'), '630', file);
          assert.equal(meta(html, 'twitter:card'), 'summary_large_image', file);
        }

        server = await preview({
          configFile: false,
          root,
          base,
          build: { outDir },
          preview: { host: '127.0.0.1', port: 0, strictPort: true },
        });
        const address = server.httpServer.address();
        assert.ok(address && typeof address === 'object');
        const origin = `http://127.0.0.1:${address.port}`;
        const page = await fetch(`${origin}${base}`, { signal: AbortSignal.timeout(10_000) });
        assert.equal(page.status, 200);
        assert.match(page.headers.get('content-type') ?? '', /text\/html/);
        const servedHtml = await page.text();
        for (const key of ['og:image', 'twitter:image']) {
          const imageUrl = meta(servedHtml, key);
          assert.equal(imageUrl, expectedImage);
          // Keep the built URL's path, replacing only its fixture origin with the local server.
          const imagePath = new URL(imageUrl, origin).pathname;
          const response = await fetch(`${origin}${imagePath}`, { signal: AbortSignal.timeout(10_000) });
          assert.equal(response.status, 200, imageUrl);
          assert.match(response.headers.get('content-type') ?? '', /^image\/png\b/);
          const image = Buffer.from(await response.arrayBuffer());
          assert.deepEqual(image.subarray(0, 8), pngSignature, 'Response must be a PNG, not an HTML fallback');
          assert.equal(image.toString('ascii', 12, 16), 'IHDR');
          assert.equal(image.readUInt32BE(16), 1200);
          assert.equal(image.readUInt32BE(20), 630);
          assert.deepEqual(image, await readFile(path.join(root, 'public/brand/launchpad-social.png')));
        }
      } finally {
        if (server) {
          server.httpServer.closeAllConnections();
          await new Promise((resolve, reject) => server.httpServer.close(error => error ? reject(error) : resolve()));
        }
        await rm(outDir, { recursive: true, force: true });
      }
    });
  }
}
