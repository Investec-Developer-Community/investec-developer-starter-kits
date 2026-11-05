import { readFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { parseBaseline, reviewOfficialContracts } from './official-contract-review';

const usage = `Usage: pnpm review:api [--json | --candidate] [--baseline PATH]
Read-only official OpenAPI comparison. Default baseline: scripts/official-api-baseline.json.
--candidate prints unapproved snapshots as JSON; it NEVER writes or approves a baseline.
Exit 0: unchanged and approved; 1: human review needed; 2: command/baseline error.
See scripts/API_ALIGNMENT.md for the manual approval process.`;

try {
  const args = process.argv.slice(2).filter(arg => arg !== '--');
  let baselinePath = fileURLToPath(new URL('../../../../scripts/official-api-baseline.json', import.meta.url));
  let mode = 'text';
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--help' && args.length === 1) { mode = 'help'; break; }
    if (args[i] === '--baseline' && args[i + 1] && !args[i + 1].startsWith('--')) {
      baselinePath = args[++i];
    } else if (['--json', '--candidate'].includes(args[i]) && mode === 'text') {
      mode = args[i].slice(2);
    } else throw new Error(usage);
  }
  if (mode === 'help') console.log(usage);
  else {
    if ((await stat(baselinePath)).size > 8_000_000) throw new Error('Baseline exceeds 8 MB limit');
    const baseline = parseBaseline(JSON.parse(await readFile(baselinePath, 'utf8')));
    const { candidate, ...report } = await reviewOfficialContracts(baseline);
    if (mode === 'candidate') console.log(JSON.stringify(candidate, null, 2));
    else if (mode === 'json') console.log(JSON.stringify(report, null, 2));
    else {
      console.log(`Official API contract review · ${report.runAt}\n${report.note}`);
      for (const result of report.results) {
        console.log(`\n${result.label}: ${result.state}\n  ${result.sourceUrl}`);
        if ('error' in result) console.log(`  ${result.error}`);
        else {
          console.log(`  Observed SHA-256: ${result.sha256}\n  Retrieval: ${result.method}; final URL: ${result.finalUrl}`);
          if (result.state === 'missing-approval') console.log('  No human-approved baseline. Inspect a --candidate snapshot before approving.');
          for (const difference of result.differences) console.log(`  ${difference.area} ${difference.kind}: ${difference.pointer}`);
          if (result.truncated) console.log(`  Showing 500 of ${result.total} differences; inspect full candidate.`);
        }
      }
      console.log('\nUse --json for before/after values. Baselines and API guidance dates are never updated by this command.');
    }
    process.exitCode = report.needsReview ? 1 : 0;
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 2;
}
