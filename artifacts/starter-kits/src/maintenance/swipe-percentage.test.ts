import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdir, rm, rmdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { promisify } from 'node:util';
import { kits } from '../data/kits.ts';
import { starterFiles, starterInstructions } from '../lib/starter-bundle.ts';

const execFileAsync = promisify(execFile);

test('downloaded Swipe n Save script explains, validates and calculates percentage values', async () => {
  const kit = kits.find(candidate => candidate.slug === 'swipe-n-save');
  assert.ok(kit, 'Swipe n Save must be registered in the production kit catalog');

  const files = starterFiles(kit);
  const { command } = starterInstructions(kit);
  const [runner, ...baseArgs] = command.split(' ');
  assert.equal(runner, 'node');
  assert.equal(files[kit.scriptFile], kit.script, 'the generated download must use the registered runner');
  assert.equal(baseArgs[0], kit.scriptFile);
  assert.equal(baseArgs[1], `./${kit.dataFile}`);

  const copy = [
    kit.summary,
    ...kit.setup.map(step => step.body),
    ...kit.limitations,
    files['README.md'] ?? '',
    files[kit.scriptFile] ?? '',
  ].join('\n');
  assert.match(copy, /5 means 5%/);
  assert.match(kit.summary, /1–10,000 numeric range advertised in the upstream README/);
  assert.doesNotMatch(copy, /1 to 10000|1-10000|up to 10000%|percent 1-10000/i);

  const parent = resolve(process.cwd(), '.test-work');
  const directory = join(parent, `swipe-percentage-${process.pid}-${Date.now()}`);
  await mkdir(directory, { recursive: true });
  const defaultData = JSON.parse(files[kit.dataFile] ?? '{}');
  const testData = {
    ...defaultData,
    percent: 10,
    transactions: [{ merchant: 'Test purchase', mcc: '5411', amount: 123.45 }],
  };

  async function run(percent?: string, data: unknown = defaultData) {
    await writeFile(join(directory, kit.scriptFile), files[kit.scriptFile] ?? '');
    await writeFile(join(directory, kit.dataFile), JSON.stringify(data));

    try {
      const { stdout, stderr } = await execFileAsync(
        process.execPath,
        [...baseArgs, ...(percent === undefined ? [] : [percent])],
        { cwd: directory, encoding: 'utf8', timeout: 10_000 },
      );
      return { code: 0, stdout, stderr };
    } catch (error) {
      const failure = error as Error & { code?: number | string; stdout?: string; stderr?: string };
      return {
        code: typeof failure.code === 'number' ? failure.code : -1,
        stdout: failure.stdout ?? '',
        stderr: failure.stderr ?? '',
      };
    }
  }

  try {
    const defaultRun = await run();
    assert.equal(defaultRun.code, 0, defaultRun.stderr);
    assert.match(defaultRun.stdout, /^MOCK SIMULATION at 10% - no money moves\.$/m);
    for (const amount of ['45.63', '82.02', '9.75', '134.90']) {
      assert.match(defaultRun.stdout, new RegExp(`R\\s+${amount.replace('.', '\\.')}`));
    }
    assert.match(defaultRun.stdout, /ATM withdrawal \(MCC 6011\) excluded/);
    assert.match(defaultRun.stdout, /Would-be total to savings: R 272\.30/);

    for (const [percent, amount] of [['1', '1.23'], ['5', '6.17'], ['10000', '12345.00']]) {
      const result = await run(percent, testData);
      assert.equal(result.code, 0, `${percent} should be accepted: ${result.stderr}`);
      assert.match(result.stdout, new RegExp(`MOCK SIMULATION at ${percent}%`));
      assert.match(result.stdout, new RegExp(`Would-be total to savings: R ${amount.replace('.', '\\.')}`));
    }

    for (const percent of ['0', '-1', '10001']) {
      const result = await run(percent, testData);
      assert.equal(result.code, 1, `${percent} must be rejected`);
      assert.match(result.stderr, /upstream README-advertised numeric range 1–10,000 \(5 means 5%\)/);
    }

    for (const percent of ['Infinity', '-Infinity', 'NaN', '1e309']) {
      const result = await run(percent, testData);
      assert.equal(result.code, 1, `${percent} must be rejected`);
      assert.match(result.stderr, /percent must be finite/);
    }

    for (const percent of ['not-a-number', '5%', '', '0x10']) {
      const result = await run(percent, testData);
      assert.equal(result.code, 1, `${JSON.stringify(percent)} must be rejected`);
      assert.match(result.stderr, /percent must be a numeric value; enter 5 for 5%/);
    }

    const invalidJsonSetting = await run(undefined, { ...testData, percent: '5' });
    assert.equal(invalidJsonSetting.code, 1, 'a string in the JSON percent field must not be coerced');
    assert.match(invalidJsonSetting.stderr, /percent must be a numeric JSON value \(5 means 5%\)/);
  } finally {
    await rm(directory, { recursive: true, force: true });
    await rmdir(parent).catch(() => {});
  }
});
