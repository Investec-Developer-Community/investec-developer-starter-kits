import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { kits } from '../data/kits.ts';
import { starterFiles, starterInstructions } from '../lib/starter-bundle.ts';

const execFileAsync = promisify(execFile);
const expectedOutput = [
  'TRANSACTIONS - categories are derived from description.',
  '2025-03-01  Woolies Food Rosebank        R    842.35  POSTED',
  '2025-03-02  Gautrain Sandton             R     74.00  POSTED',
  '2025-03-03  Bean There Coffee            R     46.50  POSTED',
  '2025-03-04  City Power prepaid           R    600.00  POSTED',
  '2025-03-05  Checkers Sixty60             R    517.89  POSTED',
  '2025-03-06  Bolt trip Braamfontein       R     63.20  POSTED',
  '2025-03-07  Kauai Melrose Arch           R    112.00  POSTED',
  '2025-03-08  Showmax subscription         R     99.00  POSTED',
  '2025-03-09  Engen Jan Smuts              R    950.40  POSTED',
  '2025-03-10  Spotify Family               R    119.99  POSTED',
  '2025-03-11  Pick n Pay Parkhurst         R    388.60  PENDING',
  '2025-03-12  Nandos Greenside             R    231.50  PENDING',
  '',
  'Posted debit totals by category:',
  '  Groceries      R 1360.24',
  '  Fuel           R 950.40',
  '  Utilities      R 600.00',
  '  Subscriptions  R 218.99',
  '  Eating out     R 158.50',
  '  Transport      R 137.20',
].join('\n') + '\n';

test('downloaded Spend Explorer emits exact mock-only output with no credentials or network', async () => {
  const kit = kits.find(candidate => candidate.slug === 'spend-explorer');
  assert.ok(kit, 'Spend Explorer must be registered in the production kit catalog');
  const files = starterFiles(kit);
  const { command } = starterInstructions(kit);
  assert.equal(command, 'node spend-explorer.mjs ./spend-explorer-mock-data.json');
  assert.equal(files['spend-explorer.mjs'], kit.script, 'the downloaded runner must be exercised');
  assert.ok(files['sample-helpers.mjs']?.includes('createSampleData'), 'the shared sample helper is bundled for local fixture access');

  const directory = join(resolve(process.cwd(), '.test-work'), `spend-explorer-${process.pid}-${Date.now()}`);
  const guard = fileURLToPath(new URL('../../../../scripts/test-fetch-local-only.mjs', import.meta.url));
  await mkdir(directory, { recursive: true });

  try {
    for (const [filename, contents] of Object.entries(files)) {
      await writeFile(join(directory, filename), contents);
    }
    const { stdout } = await execFileAsync(
      process.execPath,
      command.split(' ').slice(1),
      {
        cwd: directory,
        encoding: 'utf8',
        timeout: 15_000,
        env: {
          PATH: process.env.PATH ?? '',
          TEST_FETCH_MODE: 'deny',
          NODE_OPTIONS: `--import=${guard}`,
        },
      },
    );
    assert.equal(stdout, expectedOutput, 'the downloaded runner emits exact expected output by default');
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
