import { Link } from 'wouter';
import { Clock } from 'lucide-react';
import { type Kit } from '@/data/kits';
import { useLocalStore } from '@/lib/local';
import { cn } from '@/lib/utils';

const diffDots = { Beginner: 1, Intermediate: 2, Advanced: 3 };

export function KitCard({ kit, index = 0 }: { kit: Kit; index?: number }) {
  const { progress } = useLocalStore();
  const done = kit.checklist.filter((c) => (progress[kit.slug] ?? []).includes(c.id)).length;
  const pct = Math.round((done / kit.checklist.length) * 100);
  return (
    <article className="rise group relative min-w-0 border bg-card rounded-xl shadow-sm p-5 flex flex-col gap-3 transition-transform hover:shadow-md"
      style={{ animationDelay: `${index * 70}ms` }} data-testid={`card-kit-${kit.slug}`}>
      <div className="flex items-start justify-between gap-3">
        <span className="font-semibold text-[11px] uppercase tracking-wide text-muted-foreground">{kit.category}</span>
      </div>
      <h3 className="text-lg font-semibold">
        <Link href={`/kits/${kit.slug}`} className="after:absolute after:inset-0" data-testid={`link-kit-${kit.slug}`}>{kit.name}</Link>
      </h3>
      <p className="text-sm text-muted-foreground">{kit.tagline}</p>
      <div className="mt-auto pt-3 border-t border-dashed border-slate-300 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
        <span className="flex items-center gap-1" title={`${kit.difficulty} (offline guide)`}>
          {[1, 2, 3].map((d) => <span key={d} className={cn('w-2 h-2 rounded-full', d <= diffDots[kit.difficulty] ? 'bg-primary' : 'bg-border')} />)}
          <span className="ml-1">{kit.difficulty}</span>
        </span>
        <span className="flex items-center gap-1" title="Offline guide estimate, not a live integration estimate"><Clock className="w-3 h-3" />~{kit.minutes} min offline</span>
        <span className={cn('ml-auto', kit.origin === 'community' ? 'text-primary' : 'text-muted-foreground')}>
          {kit.origin === 'community' ? 'Community · mock adaptation' : 'Illustrative'}
        </span>
      </div>
      {done > 0 && (
        <div role="progressbar" aria-label={`${kit.name} manual checklist progress`} aria-valuenow={done} aria-valuemin={0} aria-valuemax={kit.checklist.length} className="h-1 bg-secondary rounded overflow-hidden" data-testid={`progress-${kit.slug}`}>
          <div className="h-full bg-primary origin-left transition-transform" style={{ transform: `scaleX(${pct / 100})` }} />
        </div>
      )}
    </article>
  );
}
