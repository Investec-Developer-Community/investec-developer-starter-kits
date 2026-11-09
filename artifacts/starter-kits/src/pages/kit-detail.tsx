import { sourceReviewStatus } from '@/data/source-review';
import { apiAlignment, accountKitSlugs } from '@/data/official-api';
import { CommandBlock } from '@/components/command-block';
import { Link, useParams } from 'wouter';
import { ArrowLeft, Check, Download, ExternalLink, FileJson, FileCode, Package, Play, RotateCcw, Terminal, TriangleAlert } from 'lucide-react';
import { getKit } from '@/data/kits';
import { useLocalStore } from '@/lib/local';
import { DemoFrame } from '@/components/demo-frame';
import { downloadStarterBundle, starterInstructions } from '@/lib/starter-bundle';
import { useToast } from '@/hooks/use-toast';
import { useTextDownload } from '@/hooks/use-text-download';
import { cn } from '@/lib/utils';
import { LocalTroubleshooting } from '@/components/local-troubleshooting';
import { TakeItFurther } from '@/components/take-it-further';
import { kitIssueUrl } from '@/lib/community-links';
import { OfficialApiGuidance } from '@/components/official-api-guidance';
import { CardCodeSampleGuide } from '@/components/card-code-sample-guide';
import { ChecklistStorageNotice } from '@/components/checklist-storage-notice';

export default function KitDetail() {
  const { slug = '' } = useParams<{ slug: string }>();
  const kit = getKit(slug);
  const { progress, persistence, toggleStep, resetProgress, retryStorage } = useLocalStore();
  const { toast } = useToast();
  const downloadText = useTextDownload();
  if (!kit) {
    return (
      <div className="max-w-xl mx-auto px-4 py-24 text-center" data-testid="kit-not-found">
        <div className="text-sm font-semibold text-accent">404 · unknown kit</div>
        <h1 className="text-3xl font-semibold mt-2">No kit called "{slug}".</h1>
        <p className="text-muted-foreground mt-2">It may have been renamed, or the link has a typo.</p>
        <Link href="/" className="press inline-block mt-6 bg-primary text-primary-foreground px-4 py-2 rounded-xl font-semibold" data-testid="link-back-library">Browse the library</Link>
      </div>
    );
  }
  const done = progress[kit.slug] ?? [];
  const count = kit.checklist.filter((c) => done.includes(c.id)).length;
  const dl = (which: 'script' | 'data') => {
    if (which === 'script') downloadText(kit.scriptFile, kit.script, 'text/javascript');
    else downloadText(kit.dataFile, JSON.stringify(kit.mockData, null, 2), 'application/json');
  };
  const zip = async () => {
    try { await downloadStarterBundle(kit); toast({ title: 'Download started', description: `${kit.slug} starter bundle (.zip)` }); }
    catch (e) { toast({ variant: 'destructive', title: 'ZIP download failed', description: `${e instanceof Error ? e.message : 'Unknown error'}. The individual files below still work.` }); }
  };
  const run = starterInstructions(kit);
  const nodeRequirement = kit.slug === 'card-guard' ? 'Node 20.12+' : 'Node 18+';
  const cardCodeStep = kit.slug === 'card-guard'
    ? kit.setup.find(step => step.title === 'Try the card-code teaching model' && step.code)
    : undefined;
  const isCard = !accountKitSlugs.includes(kit.slug);
  const refLinks = isCard
    ? [{ id: 'card-mapping', label: 'Card: mock purchase vs REST simulation vs runtime' }, { id: 'field-mappings', label: 'Field mappings and local checks' }]
    : [{ id: 'account-mapping', label: 'Accounts: mock row vs transaction envelope' }, { id: 'pending-refunds', label: 'Pending purchases, posted debits and possible refunds' }, { id: 'field-mappings', label: 'Field mappings and local checks' }];
  const alignment = apiAlignment(kit.slug);
  const sections = [{ id: 'try', label: 'Try' }, { id: 'run', label: 'Run' }, { id: 'api-notes', label: 'API notes' }, { id: 'sources', label: 'Sources' }];
  const issueUrl = kitIssueUrl(kit.slug);
  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <Link href="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground" data-testid="link-back"><ArrowLeft className="w-4 h-4" />All kits</Link>
      <header className="rise mt-4 border-b pb-6">
        <div className="flex flex-wrap items-start gap-4 justify-between">
          <div className="min-w-0 max-w-3xl">
            <div className="font-semibold text-xs uppercase tracking-wide text-muted-foreground">{kit.category} · {kit.difficulty} · ~{kit.minutes} min offline guide estimate</div>
            <h1 className="text-3xl font-semibold tracking-tight mt-2" data-testid="text-kit-name">{kit.name}</h1>
            <p className="mt-2 text-lg" data-testid="text-outcome">{kit.tagline}</p>
            <p className="mt-2 text-sm text-muted-foreground">{kit.summary}</p>
          </div>
        </div>
        <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-sm" data-testid="text-prereqs">
          <div className="flex gap-1"><dt className="text-muted-foreground">Local run:</dt><dd>{nodeRequirement} (browser demo needs no install)</dd></div>
          <div className="flex gap-1"><dt className="text-muted-foreground">Credentials:</dt><dd>none</dd></div>
          <div className="flex gap-1"><dt className="text-muted-foreground">Data:</dt><dd>fictional mock only, no bank connection</dd></div>
        </dl>
        <div className="mt-3 text-sm">
          {kit.credit ? (
            <span data-testid="text-credit">Community project · original by {kit.credit.authors.map((a, i) => (
              <span key={a.name}>{i > 0 && ', '}<strong>{a.name}</strong>{a.handle && <span className="font-mono text-xs text-muted-foreground"> {a.handle}</span>}</span>
            ))} · Launchpad mock adaptation{kit.credit.links[0] && <> · <a href={kit.credit.links[0].url} target="_blank" rel="noreferrer" className="underline text-primary" data-testid="link-header-repo">original repository</a></>}</span>
          ) : (
            <span className="text-muted-foreground">New illustrative example kit · not attributed to any hackathon · no source repo</span>
          )}
        </div>
        <div className="mt-5 flex flex-wrap gap-3">
          <a href="#try" className="press inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-semibold" data-testid="link-try-demo"><Play className="w-4 h-4" />Try demo</a>
          <a href="#run" className="press inline-flex items-center gap-2 bg-[#0f172a] text-white px-4 py-2 rounded-xl text-sm font-semibold" data-testid="link-run-locally"><Terminal className="w-4 h-4" />Run locally</a>
        </div>
        <nav aria-label="On this page" className="mt-5 flex flex-wrap gap-4 text-sm">
          {sections.map((x) => <a key={x.id} href={`#${x.id}`} className="text-muted-foreground hover:text-foreground underline-offset-4 hover:underline" data-testid={`link-section-${x.id}`}>{x.label}</a>)}
        </nav>
        <p className="mt-4 text-sm">
          <a href={issueUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4 text-primary" data-testid="link-report-kit-issue">
            Edit / report a problem with this kit
          </a>
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-10 mt-8">
        <div className="space-y-12 min-w-0">
          <section id="try" aria-labelledby="h-try" className="scroll-mt-32 md:scroll-mt-36"><h2 id="h-try" className="text-2xl font-semibold mb-4">Try it in the browser</h2><DemoFrame slug={kit.slug} /></section>

          <section id="run" aria-labelledby="h-run" className="scroll-mt-32 md:scroll-mt-36">
            <h2 id="h-run" className="text-2xl font-semibold mb-4">Run it locally</h2>
            <div className="border rounded-xl bg-card shadow-sm p-4 space-y-3" data-testid="section-starter-files">
              <div className="font-semibold text-xs uppercase tracking-wide text-muted-foreground">Starter files</div>
              <button type="button" onClick={zip} className="press w-full flex items-center gap-2 bg-primary text-primary-foreground px-3 py-2 rounded-xl text-sm font-semibold" data-testid="button-download-bundle">
                <Package className="w-4 h-4 shrink-0" /><span className="flex-1 min-w-0 text-left">{kit.slug === 'card-guard' ? 'Starter bundle (.zip): mock rules and card-code sample' : 'Starter bundle (.zip): script, JSON, README'}</span><Download className="w-4 h-4 shrink-0" />
              </button>
              <div className="grid sm:grid-cols-2 gap-2">
                <button type="button" onClick={() => dl('script')} className="press w-full flex items-center gap-2 border px-3 py-2 rounded-xl text-sm hover:bg-secondary min-w-0" data-testid="button-download-script">
                  <FileCode className="w-4 h-4 shrink-0" /><span className="min-w-0 flex-1 text-left break-all">{kit.scriptFile}</span><Download className="w-4 h-4 shrink-0" />
                </button>
                <button type="button" onClick={() => dl('data')} className="press w-full flex items-center gap-2 border px-3 py-2 rounded-xl text-sm hover:bg-secondary min-w-0" data-testid="button-download-data">
                  <FileJson className="w-4 h-4 shrink-0" /><span className="min-w-0 flex-1 text-left break-all">{kit.dataFile}</span><Download className="w-4 h-4 shrink-0" />
                </button>
              </div>
              <div>
                <div className="text-sm font-semibold">Run from the folder containing both files</div>
                <CommandBlock code={run.command} />
              </div>
              <div>
                <div className="text-sm font-semibold">Expected output</div>
                <pre className="mt-2 overflow-x-auto rounded-xl bg-secondary p-3 text-xs" tabIndex={0} data-testid="text-expected-output">{run.expected}</pre>
              </div>
              <p className="text-xs text-muted-foreground">{nodeRequirement}, no credentials, no network. Dry-run on fictional data only.</p>
            </div>
            {cardCodeStep?.code && <CardCodeSampleGuide command={cardCodeStep.code} />}
            <ol className="space-y-5 mt-6">
              {kit.setup.map((s, i) => (
                <li key={i} className="grid grid-cols-[2rem_1fr] gap-3">
                  <span className="font-mono text-sm text-accent pt-0.5">{String(i + 1).padStart(2, '0')}</span>
                  <div className="min-w-0"><div className="font-semibold">{s.title}</div><p className="text-sm text-muted-foreground">{s.body}</p>{s.code && <CommandBlock code={s.code} />}</div>
                </li>
              ))}
            </ol>
            <LocalTroubleshooting kit={kit} />
            <div className="mt-6" data-testid="section-limitations">
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2"><TriangleAlert className="w-5 h-5 text-accent" />Known limitations</h3>
              <ul className="space-y-2">
                {kit.limitations.map((l, i) => <li key={i} className="border-l-2 border-accent pl-3 text-sm">{l}</li>)}
              </ul>
            </div>
          </section>

          <TakeItFurther />

          <section id="api-notes" aria-labelledby="h-api" className="scroll-mt-32 md:scroll-mt-36">
            <h2 id="h-api" className="text-2xl font-semibold mb-4">API notes</h2>
            <p className="text-sm text-muted-foreground mb-3">Illustrative alignment notes based on documented examples; not a live response or compatibility guarantee.</p>
            {alignment.notes.length > 0 && <ul className="space-y-3 text-sm [overflow-wrap:anywhere] mb-4">{alignment.notes.map(note => <li key={note} className="border-l-2 border-accent pl-3">{note}</li>)}</ul>}
            <div className="border rounded-xl p-4 space-y-3">
              <h3 id="kit-official-next-step-title" className="font-semibold">Official next steps and illustrative sample notes</h3>
              <OfficialApiGuidance slug={kit.slug} docs={alignment.docs} />
            </div>
            <div className="mt-5 border rounded-xl p-4" data-testid="section-reference-links">
              <div className="font-semibold text-sm">Mock vs API reference for this kit</div>
              <p className="text-xs text-muted-foreground mt-1">Fictional fixtures with uncertainty labels and runnable local checks. Not proof of API compatibility.</p>
              <ul className="mt-2 space-y-1 text-sm">{refLinks.map(r => <li key={r.id}><Link href={`/reference#${r.id}`} className="underline text-primary" data-testid={`link-reference-${r.id}`}>{r.label}</Link></li>)}</ul>
            </div>
          </section>

          <section id="sources" aria-labelledby="h-sources" className="scroll-mt-32 md:scroll-mt-36">
            <h2 id="h-sources" className="text-2xl font-semibold mb-4">Sources</h2>
            {kit.credit ? (
              <div className="space-y-3">
                <div className="grid sm:grid-cols-2 gap-3" data-testid="section-provenance">
                  <div className="border bg-card shadow-sm rounded-xl p-4">
                    <div className="font-semibold text-xs uppercase tracking-wide text-muted-foreground">Upstream community project</div>
                    <p className="text-sm mt-1">{kit.credit.upstream}</p>
                    <p className="text-xs text-muted-foreground mt-2">By {kit.credit.authors.map((a) => a.name).join(', ')}. Reviewed from its README; not executed, audited or certified compatible.</p>
                    {kit.credit.acknowledgements?.map((a) => <p key={a} className="text-xs mt-1">{a}</p>)}
                  </div>
                  <div className="border-2 border-dashed border-accent rounded-xl p-4">
                    <div className="font-semibold text-xs uppercase tracking-wide text-accent">Launchpad mock adaptation</div>
                    <p className="text-sm mt-1">{kit.credit.adaptation}</p>
                    {kit.credit.licence && <p className="text-xs text-muted-foreground mt-2" data-testid="text-licence">Licence: {kit.credit.licence}</p>}
                    <p className="text-xs text-muted-foreground mt-2" data-testid="text-source-review">
                      {sourceReviewStatus(kit.credit.sourceReview.checkedOn)}. Link review only; not a compatibility or security certification.
                    </p>
                  </div>
                </div>
                <div className="border rounded-xl bg-card shadow-sm p-4 space-y-2 text-sm">
                  <div className="font-semibold text-xs uppercase tracking-wide text-muted-foreground">Original sources</div>
                  {kit.credit.links.map((l, i) => (
                    <a key={l.url} href={l.url} target="_blank" rel="noreferrer" className="flex items-start gap-2 hover:text-primary break-all" data-testid={`link-source-${i}`}><ExternalLink className="w-4 h-4 shrink-0 mt-0.5" />{l.label}</a>
                  ))}
                  {kit.credit.authors.filter((a) => a.url).map((a) => (
                    <a key={a.url} href={a.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-muted-foreground hover:text-primary" data-testid={`link-author-${a.name}`}><ExternalLink className="w-4 h-4" />{a.name} on GitHub</a>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground border rounded-xl p-4">Illustrative kit written for Launchpad. Not attributed to any hackathon or community project and has no source repository. Official documentation is linked under API notes.</p>
            )}
          </section>
        </div>

        <aside aria-label="Kit checklist" className="min-w-0 space-y-6 lg:sticky lg:top-32 self-start">
          <div className="border rounded-xl bg-card shadow-sm p-4">
            <div className="flex items-center justify-between">
              <div className="font-semibold text-xs uppercase tracking-wide text-muted-foreground">Checklist</div>
              <span className="font-mono text-xs" data-testid="text-progress">{count}/{kit.checklist.length}</span>
            </div>
            <div className="h-1 bg-secondary rounded overflow-hidden my-3"><div className="h-full bg-primary origin-left transition-transform duration-300" style={{ transform: `scaleX(${count / kit.checklist.length})` }} /></div>
            <ChecklistStorageNotice persistence={persistence} onRetry={retryStorage} />
            <ul className="space-y-1">
              {kit.checklist.map((c) => {
                const on = done.includes(c.id);
                return (
                  <li key={c.id}>
                    <button type="button" aria-pressed={on} onClick={() => toggleStep(kit.slug, c.id)} className="press w-full flex items-start gap-2 text-left text-sm p-1.5 rounded hover:bg-secondary" data-testid={`checkbox-step-${c.id}`}>
                      <span className={cn('mt-0.5 w-4 h-4 shrink-0 rounded-xl border grid place-items-center transition-colors', on && 'bg-primary border-primary text-primary-foreground')}>{on && <Check className="w-3 h-3" />}</span>
                      <span className={cn(on && 'line-through text-muted-foreground')}>{c.label}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
            {count > 0 && <button type="button" onClick={() => resetProgress(kit.slug)} className="mt-2 text-xs text-muted-foreground hover:text-foreground flex items-center gap-1" data-testid="button-reset-progress"><RotateCcw className="w-3 h-3" />Reset progress</button>}
            <p className="text-[11px] text-muted-foreground mt-3">Checklist ticks are manual; nothing is completed automatically. Stored in this browser only, not synced to other devices or sent anywhere. Clearing site data removes progress.</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
