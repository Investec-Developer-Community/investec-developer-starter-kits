import { kits } from '../data/kits';
import { reviewSources } from './source-review';

const args = process.argv.slice(2).filter((arg) => arg !== '--');
if (args.some((arg) => arg !== '--json' && arg !== '--help')) {
  console.error('Usage: pnpm review:sources [--json]');
  process.exitCode = 2;
} else if (args.includes('--help')) {
  console.log('Usage: pnpm review:sources [--json]\nRead-only repository, README and licence review. Exit 0: clear; 1: human review needed; 2: command error.');
} else {
  try {
    const report = await reviewSources(kits);
    if (args.includes('--json')) {
      console.log(JSON.stringify(report, null, 2));
    } else {
      console.log(`Launchpad source review · ${report.runAt}\nRead-only check. No upstream code executed or attribution changed.`);
      for (const kit of report.results) {
        console.log(`\n${kit.slug}: ${kit.needsReview ? 'REVIEW NEEDED' : 'OK'} (approved check: ${kit.checkedOn ?? 'not recorded'})`);
        for (const link of kit.links) {
          console.log(`  ${link.kind}: ${link.state} ${link.status ?? ''} ${link.url}`);
          if (link.finalUrl !== link.url && link.finalUrl) console.log(`    Final URL: ${link.finalUrl}`);
          if (link.sha256) console.log(`    Observed SHA-256: ${link.sha256}`);
        }
        for (const finding of kit.findings) console.log(`  ! ${finding}`);
      }
      console.log(`\nOfficial API guidance reviewed: ${report.apiGuidanceReviewedOn}`);
      console.log(report.officialReviewNote);
      for (const link of report.officialReferences) console.log(`  ${link.kind}: ${link.state} ${link.status ?? ''} ${link.url}${link.error ? ' — ' + link.error : ''}`);
      console.log(`\nSkipped illustrative upstream checks: ${report.skippedIllustrativeKits.join(', ')}`);
      console.log('Use --json for licence text and structured findings. See scripts/SOURCE_REVIEW.md for human approval steps.');
    }
    process.exitCode = report.needsReview ? 1 : 0;
  } catch (error) {
    console.error('Source review failed:', error instanceof Error ? error.message : String(error));
    process.exitCode = 2;
  }
}
