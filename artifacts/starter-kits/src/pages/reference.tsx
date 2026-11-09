import { Link } from 'wouter';
import { ArrowLeft } from 'lucide-react';
import { ApiMappingGuide } from '@/components/api-mapping-guide';
import { OfficialApiGuidance } from '@/components/official-api-guidance';

const toc = [
  { id: 'card-mapping', label: 'Card: mock vs REST vs runtime' },
  { id: 'account-mapping', label: 'Accounts: mock row vs envelope' },
  { id: 'pending-refunds', label: 'Pending, posted and refunds' },
  { id: 'field-mappings', label: 'Field mappings and checks' },
];

export default function Reference() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <Link href="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground" data-testid="link-back"><ArrowLeft className="w-4 h-4" />All kits</Link>
      <p className="mt-4 font-semibold text-xs uppercase tracking-wide text-accent">Reference · advanced</p>
      <h1 className="rise text-3xl font-semibold tracking-tight mt-2">Mock data vs documented API shapes</h1>
      <p className="text-muted-foreground mt-3 max-w-2xl">Read this after a kit runs locally. It compares Launchpad's fictional fixtures with documented payloads. It does not imply API compatibility.</p>
      <nav aria-label="Reference sections" className="mt-6 flex flex-wrap gap-2 text-sm">
        {toc.map((t) => <a key={t.id} href={`#${t.id}`} className="press border bg-card px-3 py-1.5 rounded-xl hover:bg-secondary" data-testid={`link-ref-${t.id}`}>{t.label}</a>)}
      </nav>
      <section className="mt-8 border rounded-xl p-5 space-y-3" aria-labelledby="official-reference-title">
        <h2 id="official-reference-title" className="text-xl font-semibold">Official next steps and illustrative sample notes</h2>
        <OfficialApiGuidance />
      </section>
      <div className="mt-8"><ApiMappingGuide /></div>
    </div>
  );
}
