import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, copyFileSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

for (const scenario of [
  { name: 'approved unchanged', code: 0, state: 'approved-and-unchanged', report: { needsReview: false, results: [{ state: 'unchanged' }] } },
  { name: 'initial baseline stays pending', code: 1, state: 'review-needed', report: { needsReview: true, results: [{ state: 'missing-approval' }] } },
  { name: 'drift needs review', code: 1, state: 'review-needed', report: { needsReview: true, results: [{ state: 'changed' }] } },
  { name: 'unavailable document needs review', code: 1, state: 'review-needed', report: { needsReview: true, results: [{ state: 'unavailable' }] } },
  { name: 'command failure', code: 2, state: 'command-failure' },
  { name: 'unexpected process failure', code: 127, state: 'command-failure' },
  { name: 'malformed output fails closed', code: 0, state: 'command-failure' },
  { name: 'inconsistent exit fails closed', code: 0, state: 'command-failure', report: { needsReview: true, results: [{ state: 'missing-approval' }] } },
]) {
  test(scenario.name, () => {
    const root = mkdtempSync(join(tmpdir(), 'ci-api-review-'));
    try {
      mkdirSync(join(root, 'scripts'));
      mkdirSync(join(root, 'bin'));
      copyFileSync(new URL('./ci-review-api.mjs', import.meta.url), join(root, 'scripts/ci-review-api.mjs'));
      const baseline = '{"formatVersion":1,"documents":{}}\n';
      writeFileSync(join(root, 'scripts/official-api-baseline.json'), baseline);
      writeFileSync(join(root, 'bin/pnpm'), `#!/usr/bin/env node
const expected = ['--silent', '--dir', 'scripts', 'run', 'review:api', '--json'];
if (JSON.stringify(process.argv.slice(2)) !== JSON.stringify(expected)) process.exit(99);
console.log(${JSON.stringify(JSON.stringify(scenario.report) ?? 'invalid output')});
console.error('test diagnostic');
process.exit(${scenario.code});
`, { mode: 0o755 });
      const output = join(root, 'generated-artifacts/official-api-review');
      mkdirSync(output, { recursive: true });
      writeFileSync(join(output, 'report.json'), '{"stale":true}');
      const summary = join(root, 'job-summary.md');
      const run = spawnSync(process.execPath, [join(root, 'scripts/ci-review-api.mjs')], {
        env: { ...process.env, PATH: `${join(root, 'bin')}:${process.env.PATH}`, GITHUB_STEP_SUMMARY: summary },
        encoding: 'utf8',
      });
      const expectedExit = scenario.state === 'command-failure' ? 2 : scenario.code;
      assert.equal(run.status, expectedExit, run.stderr);
      const status = JSON.parse(readFileSync(join(output, 'status.json'), 'utf8'));
      assert.equal(status.state, scenario.state);
      assert.equal(status.commandExitCode, scenario.code);
      assert.equal(existsSync(join(output, 'report.json')), expectedExit !== 2);
      assert.match(readFileSync(summary, 'utf8'), /never creates approvals/);
      assert.match(readFileSync(join(output, 'stderr.txt'), 'utf8'), /test diagnostic/);
      assert.equal(readFileSync(join(root, 'scripts/official-api-baseline.json'), 'utf8'), baseline);
      if (scenario.name === 'initial baseline stays pending') assert.equal(status.missingApprovals, 1);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
}
