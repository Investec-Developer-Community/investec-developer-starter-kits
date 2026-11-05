# Official API comparison

Authority: https://developer.investec.com/api-reference

## Read-only contract drift check

Run `pnpm review:api` from the repository root. Unlike `pnpm review:sources`
(reachability and community licence checks), this command downloads each of the
three references configured in `src/data/official-api.ts` under the starter-kits
artifact and compares complete OpenAPI objects:

- Direct JSON responses, nested JSON objects, and the portal's Next.js JSON
  string payloads are supported. No JavaScript is evaluated. YAML-only pages,
  missing objects and multiple distinct objects fail closed and require review.
- Requests are GET-only, unauthenticated, restricted to HTTPS
  `developer.investec.com` (including every redirect), with 5 redirects maximum,
  a 15-second per-document deadline and a 2 MB streamed response limit.
  Banking hosts, OpenAPI `servers`, external `$ref`s, scripts and download links
  are **never requested**. External reference content is not monitored.
- Object key order and whitespace are ignored. Endpoint paths/methods, inline
  request/response schemas, component schemas, required fields, types, enums,
  security and all remaining document values are compared. Arrays retain their
  order, so harmless reorderings can still require review. Descriptions and
  examples are deliberately included: guidance can become stale without a
  breaking schema change. This is structural drift detection, not a semantic
  compatibility validator.
- Text output lists category, change kind and JSON Pointer. `--json` includes
  before/after values, source/final URL, retrieval method and observed hash.
  At most 500 differences per document are listed, with explicit totals and
  truncation flags. Inspect the complete candidate for larger changes.
- Exit **0**: every contract matches an approved baseline and no redirect;
  **1**: human review required (drift, missing approval, redirect, HTTP/network
  failure or extraction failure); **2**: bad arguments or invalid/unreadable
  baseline. Errors never count as unchanged. All three documents are attempted.

### Human approval, never automatic

`scripts/official-api-baseline.json` starts deliberately empty: the documentary
review below does not include a human-approved machine snapshot.
Do not treat the review date as approval of newly fetched bytes.

1. Capture an **unapproved** candidate to a separate local file:
   `pnpm --silent --filter @workspace/scripts run review:api --candidate > /tmp/official-api-candidate.json`.
   An exit code of 1 is expected until all references have approved baselines.
   On unavailable documents the candidate omits those entries; inspect the
   regular report too and never approve an incomplete capture.
2. Inspect each full `contract` against the portal and relevant starter guidance.
   Candidate `approval` is always `null`, even when a previous snapshot was
   approved. Check `sourceUrl`, `finalUrl`, retrieval method and timestamp.
   Snapshots contain public upstream text only; never execute example code.
3. After a maintainer actually reviews it, manually replace that entry's null
   approval with `{"reviewedBy":"maintainer identifier","reviewedOn":"YYYY-MM-DD",
   "sha256":"the entry's sha256"}`. The SHA-256 binds approval to the complete
   canonical object (recursively sorted object keys; array order preserved).
   The reader validates hashes, configured source identity and approval metadata.
   These fields are an audit convention, not a cryptographic reviewer identity.
4. Test the proposed file using
   `pnpm --silent --filter @workspace/scripts run review:api --baseline /tmp/official-api-candidate.json --json`.
   The default command reads the checked-in baseline regardless of working
   directory; a custom relative path is relative to the script's working directory.
5. Only after review, manually copy approved entries into
   `scripts/official-api-baseline.json` and submit them for normal code review.
   Preserve previous snapshots in Git history. Update affected guidance and its
   review date only as a separate, deliberate human-reviewed edit.

There is no `--approve`, baseline overwrite, date update or filesystem-write
operation in the command. A new candidate never inherits an approval.
`pnpm test:api-review` runs deterministic offline extraction, comparison and
safety tests; `pnpm test:sources` covers existing source reachability checks.

## Scheduled CI and maintainer notifications

`.github/workflows/official-api-review.yml` runs every Monday at **07:23 UTC**
and can be started from **Actions → Official API review → Run workflow**.
GitHub schedules run the workflow on the default branch only, so the workflow
must first be merged there. Scheduled runs may be delayed; GitHub may disable
schedules in public repositories after 60 days without repository activity.
Check Actions and re-enable the workflow if necessary. No hosted runtime,
bank credentials, GitHub write permission or external notification service is needed.

CI invokes the same `review:api` script through
`pnpm --silent --dir scripts run review:api --json`. This invokes the package
script directly, preserves its exit status, and keeps stdout JSON-only.
The CI adapter never fetches documents itself: the command's GET-only host,
redirect, size and timeout restrictions above remain authoritative.

- **Exit 0 — approved-and-unchanged:** green run.
- **Exit 1 — review-needed:** failed run with a human-review annotation and
  job summary. Includes missing approvals, structural drift and unavailable
  references; it does not necessarily mean the upstream API broke.
- **Exit 2 — command-failure:** failed run with a distinct annotation. Invalid
  baseline/arguments, malformed output, process failures and unexpected exit
  codes must not be mistaken for contract drift or success.
- Dependency installation or runner failures also fail the workflow. If the
  review could not start there is no report; inspect the failed setup step.

After the command runs, the artifact `official-api-review-<run-id>-<attempt>`
contains `report.json` for valid review results (including exit 1), `status.json`
for the machine-readable CI outcome, raw stdout/stderr, and the job summary.
Artifacts are uploaded even when the review fails and retained for **30 days**.
Command failures without a valid report retain status and diagnostics instead.
Cancellation or runner loss can prevent uploading evidence; do not treat a
missing artifact as a successful check. Reports contain public upstream text;
do not execute examples found in them.

Maintainers should enable GitHub **Settings → Notifications → System → Actions**
web/email notifications (optionally failed workflows only). GitHub's scheduled-run
notifications go to the user who last modified the cron schedule; they are not
automatically sent to every collaborator. Keep an active maintainer responsible
for the schedule and its notifications. Manual runs notify the person who
triggered them according to their notification settings. The Actions run list,
failure annotation, summary and downloadable artifact are the shared record;
no issues, PRs or approval commits are created automatically.

Run `node --test scripts/ci-review-api.test.mjs` to verify the CI adapter offline
(exit handling, malformed reports, retained diagnostics and pending approvals).
The workflow runs this alongside `pnpm test:api-review` before the live check.

The checked-in empty baseline intentionally makes initial successful fetches
**review-needed / missing-approval**, not green. If fetching fails first, review
is still pending and unavailable references are reported, not silently approved.
To resolve it, a maintainer must follow the manual candidate inspection and
approval process above and submit the changes for normal code review. Never
suppress exit 1 with `continue-on-error`, seed approvals from fetched content,
or update teaching guidance/review dates in automation.

## Documentary review

The full OpenAPI objects embedded in the official portal's server-rendered page
payloads were extracted as JSON and inspected. No API operations were called.
The pages offer JSON/YAML download controls; a stable standalone download URL
was not verified, so no guessed download URLs are published.

Reviewed documents:
- Private Bank 1.0.1, OAS 3.0.0: https://developer.investec.com/api-reference/SA%20PB%20Account%20Information
- Card 1.0.0, OAS 3.0.0: https://developer.investec.com/api-reference/SA%20Card%20Code
- Authorisation 1.0.0, OAS 3.0.0: https://developer.investec.com/api-reference/SA%20Open%20API%20-%20Authorization

## Findings applied

- Account balances use data.currentBalance, availableBalance and currency.
  Interest Maximiser's transactional.balance, loan.balance and pendingAmount
  are teaching fields, not direct mappings. A dedicated pending-transactions
  endpoint exists; the simplified teaching fields must not imply it does not.
- Account transactions have a data.transactions envelope, uppercase POSTED/PENDING
  statuses, CREDIT/DEBIT direction and monetary-unit amounts. Spend Explorer's
  lowercase states, categories and positive-only spend are deliberately not that schema.
- Card POST /za/v1/cards/{cardKey}/code/execute takes simulationcode,
  string centsAmount, currencyCode, numeric merchantCode, merchantName,
  merchantCity and countryCode. Logged runtime examples differ: numeric
  centsAmount and nested merchant.category.code. The REST simulation request
  must not be conflated with runtime hook arguments.
- Examples describe beforeTransaction during authorisation (short-running),
  and afterTransaction after a transaction. They do not establish final
  settlement semantics. Sheet Sync's approved/declined filter is local.
- Transfers are documented at POST /za/pb/v1/accounts/{accountId}/transfermultiple,
  with transferList entries containing beneficiaryAccountId, string amount,
  myReference and theirReference, and optional profileId. Responses include
  authorisation-related outcomes; mock sums are not transfer requests.
- Client credentials require client_id, client_secret and x-api-key, with bearer
  tokens for API calls. Quickstarts specify accounts for account reads and cards
  for Card API access. Accounts and transfers prerequisites are attributed
  to upstream, not asserted as a complete current endpoint permission contract.
- Third-party authorisation is a separate approved 3-legged OAuth flow.

All six starter scripts include corresponding guidance as comments, with no
behavior or data-schema changes. Community authorship and licence notices are
preserved. Review dates are documentary evidence, not compatibility certification.
