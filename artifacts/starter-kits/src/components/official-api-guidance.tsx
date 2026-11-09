import {
  officialDocs, officialNextStepNote, officialSandboxGuide, sampleShapeGuidance,
} from '@/data/official-api';

type OfficialDoc = { label: string; url: string };

export function OfficialApiGuidance({ slug, docs = Object.values(officialDocs) }: {
  slug?: string;
  docs?: OfficialDoc[];
}) {
  return (
    <div className="space-y-3 text-sm" data-testid="official-api-guidance">
      <p>{officialNextStepNote}</p>
      <ul className="space-y-2" aria-label="Illustrative sample-shape notes">
        {sampleShapeGuidance(slug).map(note => <li key={note} className="border-l-2 border-accent pl-3">{note}</li>)}
      </ul>
      <nav aria-label="Official Investec next-step resources" className="flex flex-wrap gap-3">
        {[...docs, officialSandboxGuide].map(doc => (
          <a key={doc.url} href={doc.url} target="_blank" rel="noreferrer" className="underline text-primary"
            data-testid={doc.url === officialSandboxGuide.url ? 'link-official-sandbox' : undefined}>
            {doc.label}
          </a>
        ))}
      </nav>
    </div>
  );
}
