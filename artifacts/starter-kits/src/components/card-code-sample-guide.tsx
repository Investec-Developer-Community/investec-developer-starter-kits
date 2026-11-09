import { officialDocs } from '@/data/official-api';
import { CommandBlock } from '@/components/command-block';

export function CardCodeSampleGuide({ command }: { command: string }) {
  return (
    <section aria-labelledby="h-card-code-sample" className="border rounded-xl bg-card p-4 space-y-4" data-testid="card-code-sample-guide">
      <div>
        <h3 id="h-card-code-sample" className="text-lg font-semibold">Card-code sample and local harness</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          The ZIP includes <code>README.md</code>, <code>card-guard.mjs</code>,
          <code> card-guard-mock-data.json</code>, <code>card-rules.mjs</code>,
          <code>card-code/main.js</code>, <code>card-code/README.md</code>,
          <code>simulate-card-code.mjs</code> and <code>fixtures/authorizations/fictional-authorizations.json</code>.
        </p>
      </div>
      <p className="text-sm">
        The hook sample uses the documented names <code>beforeTransaction(authorization)</code>,
        <code> afterTransaction(transaction)</code> and <code> afterDecline(transaction)</code>. It reads only
        <code> centsAmount</code>, <code>merchant.category.code</code> and <code>merchant.name</code>, fields shown in the
        authorization logged by the official simulation example. The fixtures copy that documented shape with invented
        values. As documented, <code>true</code> approves and <code>false</code> declines; the harness then runs
        <code> afterTransaction</code> or <code>afterDecline</code>. The <code>afterDecline</code> argument fields, the
        platform time limit and timeout outcomes are not documented, so they are not simulated.
      </p>
      <div>
        <h4 className="font-semibold text-sm">Run the sample from the extracted <code>card-guard</code> folder</h4>
        <p className="mt-1 text-sm text-muted-foreground">No install, credentials, or network connection is needed.</p>
        <CommandBlock code={command} testId="card-code-run-command" />
      </div>
      <div>
        <h4 className="font-semibold text-sm">Sample output excerpt</h4>
        <pre className="mt-2 overflow-x-auto rounded-xl bg-secondary p-3 text-xs" tabIndex={0} data-testid="card-code-sample-output">{`[card code] APPROVE  Takealot           returned true; ran afterTransaction
[card code] DECLINE  Sasol Rivonia      returned false; ran afterDecline
[card code] DECLINE  Lucky Spin Online  returned false; ran afterDecline
[card code] APPROVE  Spar Kloof Street  returned true; ran afterTransaction
[local rules] APPROVE  Takealot
[local rules] DECLINE  Sasol Rivonia
[local rules] DECLINE  Lucky Spin Online
[local rules] APPROVE  Spar Kloof Street`}</pre>
        <p className="mt-2 text-sm text-muted-foreground">
          The <code>[card code]</code> lines come from the sample hook&apos;s return value; the <code>[local rules]</code> lines
          come from the independent fictional rules calculation for comparison. The runner also prints amounts, hook logs
          and rule reasons, omitted here. This bounded Node teaching model
          is not a production-ready replica of the Investec IDE.
        </p>
      </div>
      <p className="text-sm">
        <a href={officialDocs.card.url} target="_blank" rel="noreferrer" className="underline text-primary">
          Official Card API documentation
        </a>
        {' '}is the source for optional platform research; this sample does not provide deploy, publish, or live-card steps.
      </p>
    </section>
  );
}
