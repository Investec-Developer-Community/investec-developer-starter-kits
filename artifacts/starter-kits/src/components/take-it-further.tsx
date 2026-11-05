import { ExternalLink } from 'lucide-react';
import { Link } from 'wouter';

export function TakeItFurther({ detailed = false }: { detailed?: boolean }) {
  return (
    <section id="take-it-further" aria-labelledby="sandbox-heading" className="scroll-mt-40 space-y-4" data-testid="section-take-it-further">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Optional · after your first local run</p>
        <h2 id="sandbox-heading" className="mt-1 text-2xl font-semibold">Your kit works. Take it further.</h2>
        <p className="mt-2 text-sm text-muted-foreground">Choose what you want to test next. These are external development tools, not connections inside Launchpad.</p>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <article className="min-w-0 rounded-xl border bg-card p-4 flex flex-col gap-3">
          <p className="text-xs font-semibold text-muted-foreground">Official Investec sandbox</p>
          <h3 className="text-lg font-semibold">Practise official API access</h3>
          <p className="text-sm">Follow Investec’s guide to obtain sandbox credentials, create a token and make your first sandbox API call.</p>
          {detailed && <p className="text-sm text-muted-foreground">Best for learning the documented authentication flow and supported endpoint behaviour. The portal offers sandbox access without an Investec account. A successful sandbox call is not proof of production readiness or coverage of every real-world scenario.</p>}
          <a href="https://developer.investec.com/individuals#ind-howto-sandbox" target="_blank" rel="noreferrer"
            className="mt-auto inline-flex items-center gap-2 text-sm font-semibold underline underline-offset-4" data-testid="link-official-sandbox">
            Open official sandbox guide<ExternalLink className="w-4 h-4 shrink-0" aria-hidden="true" /><span className="sr-only"> (opens in a new tab)</span>
          </a>
        </article>
        <article className="min-w-0 rounded-xl border bg-card p-4 flex flex-col gap-3">
          <p className="text-xs font-semibold text-muted-foreground">Community stateful sandbox · Devin Pearson</p>
          <h3 className="text-lg font-semibold">Test your own scenarios locally</h3>
          <p className="text-sm">Create test accounts, add or remove transactions, and customise your local environment with the community simulator.</p>
          {detailed && <p className="text-sm text-muted-foreground">Best for repeatable scenarios using its documented account, beneficiary and card-code simulation controls. It is community-maintained, not an official Investec product or a guarantee of current API parity. Reviewed from its README, not executed or audited by Launchpad.</p>}
          <a href="https://github.com/devinpearson/programmable-banking-sim" target="_blank" rel="noreferrer"
            className="mt-auto inline-flex items-center gap-2 text-sm font-semibold underline underline-offset-4" data-testid="link-community-sandbox">
            Explore community simulator<ExternalLink className="w-4 h-4 shrink-0" aria-hidden="true" /><span className="sr-only"> (opens in a new tab)</span>
          </a>
        </article>
      </div>
      <p className="text-sm text-muted-foreground">Launchpad’s starter files use simplified mock data. Adapting them to either environment requires API integration work. Use fictional data, keep credentials out of browser code, and verify behaviour against the current official documentation. Neither option proves your solution is ready for real banking.</p>
      {detailed ? (
        <div className="space-y-2 text-sm">
          <p className="border-l-2 border-accent pl-3">Keep the community simulator local. Its documented default is a single profile with authentication off; do not expose it publicly or load real customer data.</p>
          <p>For card-code projects, the directory also lists a separate <a href="https://github.com/devinpearson/ipb" target="_blank" rel="noreferrer" className="underline underline-offset-4">community CLI and local emulator (opens in a new tab)</a>. Read its instructions carefully: deployment commands are different from local simulation.</p>
          <a href="https://github.com/Investec-Developer-Community/Community-Projects#-sandboxes--local-development" target="_blank" rel="noreferrer" className="inline-block underline underline-offset-4">Browse community sandbox tools and maintainers (opens in a new tab)</a>
        </div>
      ) : (
        <Link href="/getting-started#take-it-further" className="inline-block text-sm underline underline-offset-4" data-testid="link-sandbox-comparison">Compare options and local setup</Link>
      )}
    </section>
  );
}
