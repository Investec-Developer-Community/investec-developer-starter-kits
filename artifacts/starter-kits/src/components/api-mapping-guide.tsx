import { useState } from 'react';
import {
  accountEnvelopeExample, accountMockExample, cardMockExample, cardRequestExample,
  cardRuntimeExample, fieldMappings, mappingReview, runMappingChecks,
  purchaseScenarios, scenarioGuidance, runScenarioChecks,
} from '@/data/api-mappings';

function Example({ title, note, value }: { title: string; note: string; value: unknown }) {
  return <div className="min-w-0 rounded-xl border p-3">
    <h4 className="font-semibold text-sm">{title}</h4>
    <p className="text-xs text-muted-foreground my-2">{note}</p>
    <pre className="overflow-x-auto rounded bg-secondary p-3 text-xs" tabIndex={0}><code>{JSON.stringify(value, null, 2)}</code></pre>
  </div>;
}

export function ApiMappingGuide() {
  const [checks, setChecks] = useState<ReturnType<typeof runMappingChecks> | null>(null);
  const [scenarioChecks, setScenarioChecks] = useState<ReturnType<typeof runScenarioChecks> | null>(null);
  return <section id="field-mappings" className="scroll-mt-40 space-y-4" data-testid="section-api-mappings">
    <h2 className="text-2xl font-semibold">Mock → API field guide</h2>
    <p className="text-sm text-muted-foreground">Fictional, offline examples only. Separate from starter inputs, saved progress and downloads. Nothing here authenticates, sends a request or executes card code.</p>
    <p className="text-xs text-muted-foreground">Official portal OpenAPI payloads reviewed {mappingReview.date}; runtime fields observed in logged examples, not verified as a full hook contract.</p>
    <div className="flex flex-wrap gap-3 text-sm">{mappingReview.sources.map(source => <a key={source.url} href={source.url} target="_blank" rel="noreferrer" className="underline text-primary">{source.label} documentation</a>)}</div>
    <details id="card-mapping" className="scroll-mt-40 rounded-xl border p-4" open>
      <summary className="cursor-pointer font-semibold">Card: mock purchase vs REST simulation vs runtime</summary>
      <p className="my-3 text-sm">Documented operation: <code className="break-all">POST /za/v1/cards/&#123;cardKey&#125;/code/execute</code>. The request is not a hook argument. Its response wraps execution results; the runtime example below illustrates selected fields logged inside a hook, not the REST response.</p>
      <Example title="Local mock purchase" note="Card Guard-shaped fiction. Category is a hand-assigned label." value={cardMockExample} />
      <div className="mt-3 grid md:grid-cols-2 gap-3">
        <Example title="REST simulation request body" note="Documented property names and types. Code is displayed only, never run." value={cardRequestExample} />
        <Example title="Runtime hook argument — partial illustration" note="Observed in official before/after logs. Missing fields and requiredness remain unverified; do not treat this as a complete event contract." value={cardRuntimeExample} />
      </div>
      <p className="text-xs text-muted-foreground mt-3">beforeTransaction(authorization) runs during authorisation with limited execution time; afterTransaction(transaction) runs afterward. Neither this example nor a local approval proves settlement.</p>
    </details>
    <details id="account-mapping" className="scroll-mt-40 rounded-xl border p-4" open>
      <summary className="cursor-pointer font-semibold">Accounts: mock row vs transaction envelope</summary>
      <p className="my-3 text-sm">Documented operation: <code className="break-all">GET /za/pb/v1/accounts/&#123;accountId&#125;/transactions</code>. Independent fictional account response excerpt, not a guaranteed match to the card purchase.</p>
      <div className="grid md:grid-cols-2 gap-3">
        <Example title="Local mock transaction" note="Spend Explorer-shaped fiction; date, id and category are local choices." value={accountMockExample} />
        <Example title="Account response envelope — excerpt" note="Documented structure; fictional identifiers and inert example.invalid link. ZAR account assumed. Optional transaction fields omitted." value={accountEnvelopeExample} />
      </div>
      <p className="text-xs text-muted-foreground mt-3">Pending items can change or disappear; the separate pending-transactions endpoint also exists. This one-row illustration is not a reconciliation model.</p>
    </details>
    <section id="pending-refunds" className="scroll-mt-40 space-y-4 rounded-xl border p-4" aria-labelledby="purchase-scenarios" data-testid="section-purchase-scenarios">
      <h3 id="purchase-scenarios" className="text-lg font-semibold">Pending purchases, posted debits and possible refunds</h3>
      <p className="text-sm text-muted-foreground">Three independent fictional scenarios, not a timeline. Different accounts and merchants are intentional. These are selected account-row fields, not full API responses, and are unrelated to the starter inputs or card simulation.</p>
      <p className="text-xs text-muted-foreground">Source check: official Private Bank and Card API OpenAPI objects embedded in the linked portal pages, reviewed {mappingReview.date}. Documentation only; no banking API called. Field shapes are documented; lifecycle relationships below remain unverified.</p>
      <div className="space-y-4">{purchaseScenarios.map(scenario => <article key={scenario.id} className="space-y-2" data-testid={`scenario-${scenario.id}`}>
        <Example title={scenario.title} note={scenario.endpoint} value={scenario.transaction} />
        <p className="text-sm">{scenario.observation}</p>
        <p className="text-sm text-muted-foreground"><strong>Cannot infer:</strong> {scenario.limitation}</p>
      </article>)}</div>
      <dl className="space-y-3">{scenarioGuidance.map(item => <div key={item.title}>
        <dt className="text-sm font-semibold">{item.title}</dt>
        <dd className="text-sm text-muted-foreground mt-1">{item.text}</dd>
      </div>)}</dl>
      <button type="button" className="press rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground" onClick={() => setScenarioChecks(runScenarioChecks())} data-testid="button-check-scenarios">Run local scenario checks</button>
      <p className="text-xs text-muted-foreground">Checks inspect these fixtures only. They do not predict transaction outcomes, reconcile purchases or verify API compatibility. No credentials, requests, card execution or saved-progress changes.</p>
      <div aria-live="polite" data-testid="scenario-check-results">{scenarioChecks && <ul className="space-y-2 text-sm">{scenarioChecks.map(check => <li key={check.label}><strong>{check.passed ? 'PASS' : 'FAIL'}</strong> · {check.label}</li>)}</ul>}</div>
    </section>
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-left">
        <caption className="text-left font-semibold mb-2">Field mappings and verification limits</caption>
        <thead><tr>{['Local field', 'API field / shape', 'Conversion or limitation'].map(label => <th key={label} scope="col" className="border-b p-2">{label}</th>)}</tr></thead>
        <tbody>{fieldMappings.map(row => <tr key={row[0]}>{row.map((cell, i) => <td key={i} className="border-b p-2 align-top">{cell}</td>)}</tr>)}</tbody>
      </table>
    </div>
    <button type="button" className="press rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground" onClick={() => setChecks(runMappingChecks())} data-testid="button-check-mappings">Run local mapping checks</button>
    <p className="text-xs text-muted-foreground">Checks validate only these fixtures and conversion rules—not API compatibility. ZAR-only conversion rejects negatives, more than two decimals and unsafe numeric cents.</p>
    <div aria-live="polite" data-testid="mapping-check-results">{checks && <ul className="space-y-2 text-sm">{checks.map(check => <li key={check.label}><strong>{check.passed ? 'PASS' : 'FAIL'}</strong> · {check.label}</li>)}</ul>}</div>
  </section>;
}
