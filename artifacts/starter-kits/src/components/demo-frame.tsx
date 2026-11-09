import type { KitSlug } from '@/data/kit-slugs';
import { SampleDataBadge } from '@/components/sample-data-badge';
import { demoRegistry } from '@/lib/demo-registry';

export function DemoFrame({ slug }: { slug: KitSlug }) {
  const Demo = demoRegistry[slug];
  return (
    <div className="border-2 border-dashed border-slate-300 border-accent/60 rounded-xl bg-card p-5">
      <div className="flex items-center justify-between mb-4"><span className="font-semibold">Interactive demo</span><SampleDataBadge /></div>
      <Demo />
    </div>
  );
}
