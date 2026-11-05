// CI adapter only: the existing command owns all network and baseline policy.
import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync, appendFileSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = resolve(root, 'generated-artifacts/official-api-review');
mkdirSync(output, { recursive: true });
rmSync(resolve(output, 'report.json'), { force: true });

// Invoke the package script directly and silently for JSON-only stdout.
// This runs the same review:api script, preserving its actual exit status.
const result = spawnSync('pnpm', ['--silent', '--dir', 'scripts', 'run', 'review:api', '--json'], {
  cwd: root, encoding: 'utf8', timeout: 180_000, maxBuffer: 32 * 1024 * 1024,
});
writeFileSync(resolve(output, 'stdout.txt'), result.stdout ?? '');
writeFileSync(resolve(output, 'stderr.txt'), result.stderr ?? '');

let exitCode = result.status;
let failure = result.error?.message;
if (result.signal) failure = `Command terminated by ${result.signal}`;
if (![0, 1, 2].includes(exitCode) || failure) exitCode = 2;
let report;
if (exitCode !== 2) {
  try {
    report = JSON.parse(result.stdout);
    if (typeof report.needsReview !== 'boolean' || !Array.isArray(report.results) ||
        report.results.length === 0 || report.needsReview !== (exitCode === 1)) {
      throw new Error('Report is missing required fields or disagrees with command exit status');
    }
    writeFileSync(resolve(output, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  } catch (error) {
    failure = `Invalid structured report: ${error.message}`;
    exitCode = 2;
  }
}

const state = ['approved-and-unchanged', 'review-needed', 'command-failure'][exitCode];
const pending = report?.results.filter(item => item.state === 'missing-approval').length ?? 0;
const status = {
  state, exitCode, commandExitCode: result.status, signal: result.signal,
  missingApprovals: pending, failure: failure ?? null,
};
writeFileSync(resolve(output, 'status.json'), JSON.stringify(status, null, 2) + '\n');
const summary = `## Official API review: ${state}

- Review command exit: ${result.status ?? 'not available'}; CI exit: ${exitCode}.
- Unapproved initial baselines remain **pending**; this job never creates approvals.
- Missing approvals reported in this run: **${pending}**${exitCode === 2 ? ' (report may be unavailable)' : ''}.
- ${exitCode === 0 ? 'All contracts match human-approved baselines.' : exitCode === 1
    ? 'Human review required: inspect report.json for drift, missing approvals, redirects or unavailable documents.'
    : 'The command failed or produced invalid output. Inspect status.json, stdout.txt and stderr.txt; this is not an unchanged result.'}
- Download the official-api-review artifact for structured results and diagnostics (retained 30 days).
- Follow scripts/API_ALIGNMENT.md for manual review. No baseline, approval, guidance or review date was changed.
`;
writeFileSync(resolve(output, 'summary.md'), summary);
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary);
console.log(summary);
if (exitCode !== 0) {
  console.log(`::error title=Official API ${state}::${exitCode === 1
    ? 'Human review is pending. Download the report artifact and follow scripts/API_ALIGNMENT.md.'
    : 'Review command failed. Download the diagnostics artifact; do not interpret this as no drift.'}`);
}
process.exitCode = exitCode;
