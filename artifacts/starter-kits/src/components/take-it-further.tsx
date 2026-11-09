import { ExternalLink } from 'lucide-react';
import { Link } from 'wouter';

export function TakeItFurther({ detailed = false }: { detailed?: boolean }) {
  return (
    <section id="take-it-further" aria-labelledby="sandbox-heading" className="scroll-mt-40 space-y-4" data-testid="section-take-it-further">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Optional · community tools</p>
        <h2 id="sandbox-heading" className="mt-1 text-2xl font-semibold">Explore community tools</h2>
        <p className="mt-2 text-sm text-muted-foreground">These are independent projects. Launchpad links to them but does not connect to or host them.</p>
      </div>
      <article className="min-w-0 rounded-xl border bg-card p-4 flex flex-col gap-3">
        <p className="text-xs font-semibold text-muted-foreground">Community simulator · Devin Pearson (@devinpearson)</p>
        <h3 className="text-lg font-semibold">Try local scenarios</h3>
        <p className="text-sm">Explore the community simulator for local account, transaction and card-code scenarios.</p>
        <p className="text-xs text-muted-foreground">MIT · Copyright (c) 2022 Devin Pearson.</p>
        {detailed && <p className="text-sm text-muted-foreground">It is community-maintained, not an official Investec product. Launchpad has not executed or certified it.</p>}
        <a href="https://github.com/devinpearson/programmable-banking-sim" target="_blank" rel="noreferrer"
          className="inline-flex items-center gap-2 text-sm font-semibold underline underline-offset-4" data-testid="link-community-sandbox">
          Explore community simulator<ExternalLink className="w-4 h-4 shrink-0" aria-hidden="true" /><span className="sr-only"> (opens in a new tab)</span>
        </a>
        {detailed && (
          <div className="flex flex-wrap gap-3 text-sm">
            <a href="https://github.com/devinpearson/ipb" target="_blank" rel="noreferrer" className="underline underline-offset-4">Community CLI and emulator</a>
            <a href="https://github.com/Investec-Developer-Community/Community-Projects#-sandboxes--local-development" target="_blank" rel="noreferrer" className="underline underline-offset-4">Community sandbox directory</a>
          </div>
        )}
      </article>
      {detailed ? (
        <p className="text-sm text-muted-foreground">Read a community project’s own instructions before using it.</p>
      ) : (
        <Link href="/getting-started#take-it-further" className="inline-block text-sm underline underline-offset-4" data-testid="link-sandbox-comparison">Explore community tools</Link>
      )}
    </section>
  );
}
