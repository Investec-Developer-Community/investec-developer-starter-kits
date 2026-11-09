import { Link } from 'wouter';
import { TakeItFurther } from '@/components/take-it-further';
import { CommandBlock } from '@/components/command-block';
import { Download, FileCode, FileJson, Package } from 'lucide-react';
import { getKit } from '@/data/kits';
import { downloadText } from '@/lib/local';
import { downloadStarterBundle, starterInstructions } from '@/lib/starter-bundle';
import { useToast } from '@/hooks/use-toast';
import { LocalTroubleshooting } from '@/components/local-troubleshooting';
import { OfficialApiGuidance } from '@/components/official-api-guidance';

const rules = [
  { t: 'Start on fictional data', b: 'Every kit ships a mock JSON file. Get the logic right there first; it costs nothing to be wrong.' },
  { t: 'Keep examples local', b: 'Browser demos and downloaded samples use fictional data; they do not connect to a bank.' },
  { t: 'Check the documented shape', b: 'Sample categories, matches and calculations may be derived by the kit rather than supplied by an API.' },
];

export default function GettingStarted() {
  const kit = getKit('spend-explorer');
  const { toast } = useToast();
  const run = kit ? starterInstructions(kit) : { command: '', expected: '' };
  const one = (which: 'script' | 'data') => {
    if (!kit) return;
    if (which === 'script') downloadText(kit.scriptFile, kit.script, 'text/javascript');
    else downloadText(kit.dataFile, JSON.stringify(kit.mockData, null, 2), 'application/json');
    toast({ title: 'Download started', description: which === 'script' ? kit.scriptFile : kit.dataFile });
  };
  const zip = async () => {
    if (!kit) return;
    try { await downloadStarterBundle(kit); toast({ title: 'Download started', description: `${kit.slug} starter bundle` }); }
    catch (e) { toast({ variant: 'destructive', title: 'ZIP download failed', description: `${e instanceof Error ? e.message : 'Unknown error'}. Use the individual files instead.` }); }
  };
  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <p className="font-semibold text-xs uppercase tracking-wide text-accent">Getting started</p>
      <h1 className="rise text-3xl font-semibold tracking-tight mt-2">Experiment locally. Break things safely.</h1>
      <p className="text-muted-foreground mt-3 max-w-2xl">Launchpad is an independent community prototype, not an official Investec site. Nothing on it connects to a bank.</p>
      {kit && (
        <section className="mt-8 border bg-card shadow-sm rounded-xl p-5" data-testid="section-first-run">
          <p className="font-semibold text-xs uppercase tracking-wide text-accent">Step 1 · recommended beginner kit</p>
          <h2 className="text-xl font-semibold mt-1">{kit.name}</h2>
          <p className="text-sm text-muted-foreground mt-1">{kit.tagline} Node 18+, no credentials, no network.</p>
          <div className="mt-4 grid sm:grid-cols-3 gap-2">
            <button type="button" onClick={zip} className="press flex items-center gap-2 bg-primary text-primary-foreground px-3 py-2 rounded-xl text-sm font-semibold" data-testid="button-download-bundle"><Package className="w-4 h-4" /><span className="flex-1 text-left">Starter bundle (.zip)</span><Download className="w-4 h-4" /></button>
            <button type="button" onClick={() => one('script')} className="press flex items-center gap-2 border px-3 py-2 rounded-xl text-sm hover:bg-secondary min-w-0" data-testid="button-download-script"><FileCode className="w-4 h-4 shrink-0" /><span className="flex-1 text-left truncate">{kit.scriptFile}</span></button>
            <button type="button" onClick={() => one('data')} className="press flex items-center gap-2 border px-3 py-2 rounded-xl text-sm hover:bg-secondary min-w-0" data-testid="button-download-data"><FileJson className="w-4 h-4 shrink-0" /><span className="flex-1 text-left truncate">{kit.dataFile}</span></button>
          </div>
          <ol className="mt-4 space-y-3 text-sm list-decimal pl-5">
            <li>Check for Node 18 or newer.<CommandBlock code="node --version" /></li>
            <li>Unzip the bundle, or put both files in one folder, then cd into it.</li>
            <li>Run the script.<CommandBlock code={run.command} testId="text-first-command" /></li>
          </ol>
          <div className="mt-3">
            <div className="font-semibold text-xs uppercase tracking-wide text-muted-foreground">Expected output</div>
            <pre className="mt-1 overflow-x-auto rounded-xl bg-secondary p-3 text-xs" tabIndex={0} data-testid="text-expected-output">{run.expected}</pre>
          </div>
          <Link href={`/kits/${kit.slug}#try`} className="press inline-block mt-4 text-sm font-semibold underline underline-offset-4" data-testid="link-start-beginner">Open the {kit.name} kit</Link>
          <LocalTroubleshooting kit={kit} />
        </section>
      )}
      <div className="mt-12"><TakeItFurther detailed /></div>
      <section className="mt-4 border bg-card shadow-sm rounded-xl p-5" data-testid="section-simulator">
        <p className="font-semibold text-xs uppercase tracking-wide text-accent">Optional · community tool · by Devin Pearson (@devinpearson)</p>
        <h2 className="text-xl font-semibold mt-1">Run a local API simulator</h2>
        <p className="text-sm text-muted-foreground mt-2 max-w-2xl">programmable-banking-sim is an independent community Node server. MIT · Copyright (c) 2022 Devin Pearson.</p>
        <ol className="mt-4 space-y-3 text-sm list-decimal pl-5">
          <li><CommandBlock code="git clone https://github.com/devinpearson/programmable-banking-sim.git" /></li>
          <li><CommandBlock code="cd programmable-banking-sim" /></li>
          <li><CommandBlock code="npm install" /></li>
          <li><CommandBlock code="npm run dev" />Serves http://localhost:3000</li>
        </ol>
        <p className="mt-3 text-sm text-muted-foreground">Keep the simulator local. It is not an official API contract.</p>
        <div className="mt-4 flex flex-wrap gap-3 text-sm">
          <a href="https://github.com/devinpearson/programmable-banking-sim" target="_blank" rel="noreferrer" className="press border px-3 py-1.5 rounded-xl hover:bg-secondary" data-testid="link-simulator-repo">devinpearson/programmable-banking-sim</a>
          <a href="https://github.com/Investec-Developer-Community/Community-Projects" target="_blank" rel="noreferrer" className="press border px-3 py-1.5 rounded-xl hover:bg-secondary" data-testid="link-directory">Community Projects directory</a>
        </div>
      </section>
      <section className="mt-10 border rounded-xl p-5 space-y-3" aria-labelledby="official-next-step-title" data-testid="section-official-next-steps">
        <p className="font-semibold text-xs uppercase tracking-wide text-accent">Optional next step</p>
        <h2 id="official-next-step-title" className="text-xl font-semibold">Official resources and sample notes</h2>
        <OfficialApiGuidance slug="spend-explorer" />
        <Link href="/reference" className="underline text-primary text-sm" data-testid="link-reference">Explore the illustrated API shapes</Link>
      </section>
      <section className="mt-10 grid sm:grid-cols-2 gap-x-8 gap-y-6">
        {rules.map((r, i) => (
          <div key={r.t} className="rise border-t-2 border-foreground pt-3" style={{ animationDelay: `${i * 60}ms` }}>
            <div className="font-mono text-xs text-accent">{String(i + 1).padStart(2, '0')}</div>
            <h3 className="font-semibold text-lg">{r.t}</h3>
            <p className="text-sm text-muted-foreground">{r.b}</p>
          </div>
        ))}
      </section>
      <div className="mt-12 flex flex-wrap gap-3">
                <Link href="/" className="press border px-4 py-2 rounded-xl text-sm hover:bg-secondary" data-testid="link-all-kits">See all kits</Link>
      </div>
    </div>
  );
}
