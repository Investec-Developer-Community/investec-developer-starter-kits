import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFile, execFileSync } from 'node:child_process';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { kits } from '../data/kits.ts';
import { createStarterZip, starterFiles, starterInstructions } from '../lib/starter-bundle.ts';

const execFileAsync = promisify(execFile);

test('downloaded account kits run mock-only without credentials or network', async () => {
  const parent = resolve(process.cwd(), '.test-work');
  await mkdir(parent, { recursive: true });
  const root = join(parent, `kits-mock-only-${process.pid}-${Date.now()}`);
  const guard = fileURLToPath(new URL('../../../../scripts/test-fetch-local-only.mjs', import.meta.url));
  const accountKits = kits.filter(kit => kit.usesInvestecApi);
  assert.equal(accountKits.length, 5);

  try {
    await mkdir(root);
    for (const kit of accountKits) {
      const directory = join(root, kit.slug);
      const files = starterFiles(kit);
      const archive = join(root, `${kit.slug}.zip`);
      await writeFile(archive, createStarterZip(kit));
      const names = JSON.parse(execFileSync('python3', [
        '-c',
        'import json,sys,zipfile; z=zipfile.ZipFile(sys.argv[1]); assert z.testzip() is None; print(json.dumps(z.namelist()))',
        archive,
      ], { encoding: 'utf8' }));
      assert.ok(names.length > 0 && names.every((name: string) => name.startsWith(`${kit.slug}/`)));
      execFileSync('python3', ['-c', 'import zipfile,sys; zipfile.ZipFile(sys.argv[1]).extractall(sys.argv[2])', archive, root]);
      for (const [filename, contents] of Object.entries(files)) {
        assert.equal(await readFile(join(directory, filename), 'utf8'), contents);
      }

      assert.ok(files['sample-helpers.mjs'], `${kit.slug} includes its local sample helper`);
      assert.match(files['README.md'], /uses fictional data only and makes no network requests/);
      assert.doesNotMatch(files['README.md'], /curl|client_id|client_secret|x-api-key|\.env|production switch|token setup/i);
      assert.doesNotMatch(kit.script, /INVESTEC_CLIENT_ID|INVESTEC_CLIENT_SECRET|INVESTEC_API_KEY|INVESTEC_BASE_URL/);
      assert.match(kit.script, /createSampleData\(/);

      const command = starterInstructions(kit).command.split(' ').slice(1);
      const { stdout } = await execFileAsync(process.execPath, command, {
        cwd: directory,
        encoding: 'utf8',
        timeout: 15_000,
        env: {
          PATH: process.env.PATH ?? '',
          TEST_FETCH_MODE: 'deny',
          NODE_OPTIONS: `--import=${guard}`,
        },
      });

      if (kit.slug === 'interest-maximiser') {
        assert.match(stdout.replace(/[,\u00a0\u202f]/g, ''), /Transferable estimate:\s+R 11135\.35/);
      } else if (kit.slug === 'spend-explorer') {
        assert.match(stdout, /Groceries\s+R 1360\.24/);
      } else {
        const output = JSON.parse(stdout);
        if (kit.slug === 'cashflow-runway') {
          assert.equal(output.days.length, 30);
          assert.equal(output.lowestMinor, 100000);
          assert.equal(output.firstShortfall, null);
        } else if (kit.slug === 'recurring-payment-detective') {
          assert.deepEqual(output.results.filter((row: { likely: boolean }) => row.likely).map((row: { merchant: string }) => row.merchant), ['DEMO GYM', 'DEMO STREAMING']);
        } else {
          assert.deepEqual(output.invoices.map((row: { status: string }) => row.status), ['paid', 'partial', 'unpaid', 'unpaid', 'unpaid']);
          assert.deepEqual(output.payments.map((row: { status: string }) => row.status), ['matched', 'matched', 'unmatched', 'ambiguous']);
        }
      }
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
