import { useEffect, useMemo, useState } from 'react';
import { Search, X } from 'lucide-react';
import { Link } from 'wouter';
import { kits } from '@/data/kits';
import { KitCard } from '@/components/kit-card';
import { cn } from '@/lib/utils';
import { useLocalStore } from '@/lib/local';
import { buildLibraryUrl, defaultLibraryFilters, readLibraryFilters } from '@/lib/library-query';

const diffRank = { Beginner: 1, Intermediate: 2, Advanced: 3 };
const categories = ['All', ...Array.from(new Set(kits.map((k) => k.category)))];
const languages = ['All', ...Array.from(new Set(kits.map((k) => k.language)))];
const difficulties = ['All', 'Beginner', 'Intermediate', 'Advanced'];

function Chips({ label, options, value, onChange }: { label: string; options: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <div role="group" aria-label={`${label} filters`} className="flex items-center gap-2 flex-wrap">
      <span className="font-semibold text-[11px] uppercase tracking-wide text-muted-foreground w-20">{label}</span>
      {options.map((o) => (
        <button key={o} type="button" aria-pressed={value === o} onClick={() => onChange(o)} data-testid={`filter-${label.toLowerCase()}-${o.toLowerCase().replace(' ', '-')}`}
          className={cn('press text-xs px-3 py-1.5 rounded-xl border transition-colors', value === o ? 'bg-[#0f172a] text-white border-[#0f172a]' : 'bg-white hover:bg-secondary')}>{o}</button>
      ))}
    </div>
  );
}

const beginner = kits.find((k) => k.slug === 'spend-explorer');

export default function Library() {
  const { progress } = useLocalStore();
  const started = kits.map((kit) => ({
    kit, done: kit.checklist.filter((step) => (progress[kit.slug] ?? []).includes(step.id)).length,
  })).filter(({ kit, done }) => done > 0 && done < kit.checklist.length);
  const [filters, setFilters] = useState(() => typeof window === 'undefined'
    ? defaultLibraryFilters
    : readLibraryFilters(window.location.search, categories, languages));
  const { q, cat, lang, diff, sort } = filters;
  useEffect(() => {
    const url = buildLibraryUrl(window.location.pathname, window.location.search, window.location.hash, filters);
    window.history.replaceState(window.history.state, '', url);
  }, [filters]);
  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return kits
      .filter((k) => !s || [k.name, k.tagline, k.summary, k.category, ...(k.credit?.authors.flatMap((a) => [a.name, a.handle ?? '']) ?? [])].join(' ').toLowerCase().includes(s))
      .filter((k) => (cat === 'All' || k.category === cat) && (lang === 'All' || k.language === lang) && (diff === 'All' || k.difficulty === diff))
      .sort((a, b) => sort === 'name' ? a.name.localeCompare(b.name) : sort === 'difficulty' ? diffRank[a.difficulty] - diffRank[b.difficulty] : sort === 'time' ? a.minutes - b.minutes : a.addedOrder - b.addedOrder);
  }, [q, cat, lang, diff, sort]);
  const reset = () => setFilters((current) => ({
    ...current,
    q: defaultLibraryFilters.q,
    cat: defaultLibraryFilters.cat,
    lang: defaultLibraryFilters.lang,
    diff: defaultLibraryFilters.diff,
  }));
  return (
    <div>
      <section className="max-w-6xl mx-auto px-4 pt-8">
        <div className="rise bg-white border rounded-2xl shadow-sm overflow-hidden grid md:grid-cols-[1.6fr_1fr]">
          <div className="p-6 md:p-8">
            <p className="text-sm font-medium text-muted-foreground">Starter kits for SA programmable-banking builders</p>
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-foreground mt-2 max-w-xl">Pick an outcome. Try it here. Run it locally on fictional data.</h1>
            <p className="mt-3 max-w-xl text-sm text-muted-foreground">Each kit is a Node script, mock JSON and an in-browser demo. No credentials, no bank connection.</p>
            <div className="mt-5 flex flex-wrap gap-3">
              <a href="#kits" className="press bg-[#0f172a] text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-slate-800" data-testid="link-browse-kits">Browse kits</a>
              <Link href="/getting-started" className="press border bg-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-secondary" data-testid="link-hero-getting-started">Getting started</Link>
            </div>
          </div>
          {beginner && (
            <div className="border-t md:border-t-0 md:border-l bg-secondary/60 p-6 md:p-8 flex flex-col" data-testid="card-recommended">
              <p className="font-semibold text-[11px] uppercase tracking-wide text-accent">New here? Start with</p>
              <h2 className="text-xl font-semibold mt-1">{beginner.name}</h2>
              <p className="text-sm text-muted-foreground mt-1">{beginner.tagline}</p>
              <p className="text-xs text-muted-foreground mt-2">{beginner.difficulty} · ~{beginner.minutes} min offline guide estimate</p>
              <div className="mt-auto pt-4 flex flex-wrap gap-2">
                <Link href={`/kits/${beginner.slug}#try`} className="press bg-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-semibold" data-testid="link-recommended-try">Try demo</Link>
                <Link href={`/kits/${beginner.slug}#run`} className="press border bg-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-secondary" data-testid="link-recommended-run">Run locally</Link>
              </div>
            </div>
          )}
        </div>
      </section>
      {started.length > 0 && (
        <section aria-labelledby="resume-heading" className="max-w-6xl mx-auto px-4 pt-6" data-testid="section-resume">
          <div className="border rounded-xl bg-card p-4">
            <h2 id="resume-heading" className="font-semibold">Continue where you left off</h2>
            <p className="mt-1 text-xs text-muted-foreground">Manual checklist progress, stored in this browser only. Not synced; clearing site data removes it.</p>
            <ul className="mt-3 space-y-2">
              {started.map(({ kit, done }) => (
                <li key={kit.slug}>
                  <Link href={`/kits/${kit.slug}#run`} className="press flex flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-lg border px-3 py-2 text-sm hover:bg-secondary" data-testid={`link-continue-${kit.slug}`}>
                    <span className="font-semibold">{kit.name}</span>
                    <span className="text-xs text-muted-foreground">{done}/{kit.checklist.length} ticked by you · Run locally</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}
      <section id="kits" aria-labelledby="kits-heading" className="max-w-6xl mx-auto px-4 py-8 space-y-5 scroll-mt-32">
        <h2 id="kits-heading" className="sr-only">Starter kits</h2>
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input type="search" value={q} onChange={(e) => setFilters((current) => ({ ...current, q: e.target.value }))} placeholder="Search kits, e.g. savings, sheet, pinger"
              className="w-full bg-card border border-input rounded-xl pl-9 pr-9 py-2.5 focus:outline-none focus:ring-2 focus:ring-ring" aria-label="Search kits" data-testid="input-search" />
            {q && <button type="button" onClick={() => setFilters((current) => ({ ...current, q: '' }))} aria-label="Clear search" className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-secondary rounded" data-testid="button-clear-search"><X className="w-4 h-4" /></button>}
          </div>
          <select value={sort} onChange={(e) => setFilters((current) => ({ ...current, sort: e.target.value as typeof sort }))} className="bg-card border border-input rounded-xl px-3 py-2.5 text-sm" aria-label="Sort kits" data-testid="select-sort">
            <option value="name">Sort: Name A to Z</option>
            <option value="difficulty">Sort: Easiest first</option>
            <option value="time">Sort: Shortest offline guide</option>
            <option value="added">Sort: Oldest added</option>
          </select>
        </div>
        <div className="space-y-2">
          <Chips label="Category" options={categories} value={cat} onChange={(value) => setFilters((current) => ({ ...current, cat: value }))} />
          {languages.length > 2 && <Chips label="Language" options={languages} value={lang} onChange={(value) => setFilters((current) => ({ ...current, lang: value }))} />}
          <Chips label="Difficulty" options={difficulties} value={diff} onChange={(value) => setFilters((current) => ({ ...current, diff: value }))} />
        </div>
        <div className="text-sm text-muted-foreground" aria-live="polite" aria-atomic="true" data-testid="text-result-count">{list.length} of {kits.length} kits</div>
        <p className="text-xs text-muted-foreground -mt-3">Difficulty and minutes estimate the offline mock guide only, not a live API integration.</p>
        {list.length === 0 ? (
          <div className="border border-dashed border-slate-300 rounded-xl p-10 text-center" data-testid="empty-search">
            <div className="text-sm text-muted-foreground">No results</div>
            <p className="text-xl font-semibold mt-2">No kits match that combination.</p>
            <button type="button" onClick={reset} className="press mt-4 bg-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-semibold" data-testid="button-reset-filters">Clear search and filters</button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {list.map((k, i) => <KitCard key={k.slug} kit={k} index={i} />)}
          </div>
        )}
      </section>
    </div>
  );
}
