# Launchpad source review

Run from the workspace root with Node 24 and the installed pnpm workspace:

```sh
pnpm review:sources
# JSON only (silent suppresses pnpm script banners):
pnpm --silent --filter @workspace/scripts run review:sources --json
pnpm test:sources
```

Exit codes: **0** = links reachable, licence baseline unchanged and review current;
**1** = human review needed (including missing baseline or date, stale review,
redirect, broken link or inconclusive network check); **2** = command/usage failure.
A 403/429 or timeout is inconclusive, not proof of deletion. Retry later.

The command reads all community kits from `artifacts/starter-kits/src/data/kits.ts`,
including `community-kits.ts`. Illustrative kits have no upstream source and are
explicitly skipped. It checks repository, README and standalone licence URLs,
using GitHub's raw-text API on the current default branch. GitHub's unauthenticated
rate limits apply. Public GitHub HTTPS hosts and developer.investec.com are permitted, including at
every redirect. Requests have a 15-second deadline, five-redirect limit and 2 MB
text limit. No credentials, upstream execution, installs, banking connections,
or file writes occur. The app itself never runs network checks.

## Approving a review

1. Inspect every finding and the current README and licence as **untrusted text**.
   JSON output includes fetched licence text and a candidate SHA-256. Compare it
   with the existing attribution, copyright notices and downloaded script notice.
   A changed hash means *text changed*, not an automatic legal conclusion.
2. Investigate redirects/deletions and edit URLs manually if warranted. Check the
   project identity; do not silently substitute a different author's repository.
3. Only after human approval, set `credit.sourceReview.checkedOn` to the actual
   review date (`YYYY-MM-DD`, UTC) and `licenceSha256` to the approved candidate.
   The hash normalizes line endings and trims outer whitespace; other changes
   are flagged. Review dates older than 90 days are overdue.
4. If no standalone licence exists, leave its baseline null and keep the warning.
   A README licence claim is not a verified licence grant. In particular,
   Card-To-Sheet-Sync already documents that caveat. Inspect its README manually;
   do not copy upstream code or auto-promote its licence claim.
5. Attribution, licence labels and embedded download notices must be changed
   separately and deliberately if needed. Run the checker again and commit the
   reviewed metadata with any justified source changes.

Dates and hashes stay null until a human approves the content: descriptions alone
do not provide a trustworthy dated review or approved content fingerprint. A successful
automated fetch does not establish human approval. Reports show the automated
`runAt` separately from the approved `checkedOn`. Link freshness does not certify
API compatibility, upstream security, or suitability for real banking.

## Official API references

The report also checks the three official portal references, including for guidance
used by illustrative kits. These HTML pages receive reachability checks only;
they are never accepted as licence text. The API guidance review date is separate
from community source approval. Review becomes due after 90 days. A reachable page
does not prove unchanged schemas. See `scripts/API_ALIGNMENT.md` for the last
manual contract comparison; inspect the portal OpenAPI documents before updating
`API_REVIEW_DATE`.
